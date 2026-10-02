import { streamResponse, detectCallerLanguage } from "../services/llm.js";

// Map of callSid to { conversationHistory, abortController, languageMode, currentLanguage }
const sessions = new Map();

export default async function websocketRoute(fastify) {
  fastify.get("/ws", { websocket: true }, (socket, request) => {
    fastify.log.info("WebSocket connection established");

    socket.on("message", async (data) => {
      let message;
      let session;
      try {
        message = JSON.parse(data);
      } catch {
        fastify.log.error("Failed to parse WebSocket message");
        return;
      }

      switch (message.type) {
        case "setup":
          const { callSid } = message;
          // Set by the <Parameter> children on the ConversationRelay noun. "manual" means
          // this app detects language switches; "multi" means ConversationRelay does.
          const languageMode = message.customParameters?.languageMode || "multi";
          const currentLanguage = message.customParameters?.startLanguage || "multi";
          fastify.log.info({ callSid, languageMode, currentLanguage }, "Call connected");

          sessions.set(callSid, {
            conversationHistory: [],
            abortController: null,
            languageMode,
            currentLanguage,
          });

          socket.callSid = callSid;
          break;

        case "prompt":
          fastify.log.info({ lang: message.lang, voicePrompt: message.voicePrompt }, "Caller said");
          session = sessions.get(socket.callSid);

          if (session.abortController) {
            session.abortController.abort();
          }
          session.abortController = new AbortController();

          // In manual mode, detect a language switch concurrently with the LLM turn. The
          // switch language message has to reach Twilio before the speech it applies to,
          // so the first text token waits on this — by then it has usually resolved.
          const detection =
            session.languageMode === "manual"
              ? detectCallerLanguage(message.voicePrompt, session.currentLanguage, fastify.log)
              : null;
          let languageFlushed = false;

          const flushLanguageSwitch = async () => {
            if (languageFlushed || !detection) return;
            languageFlushed = true;

            const language = await detection;
            if (!language) return;

            fastify.log.info({ language }, "Sending switch language message");
            socket.send(
              JSON.stringify({
                type: "language",
                ttsLanguage: language,
                transcriptionLanguage: language,
              }),
            );
            session.currentLanguage = language;
          };

          try {
            session.conversationHistory.push({ role: "user", content: message.voicePrompt });

            const { endCall, reason } = await streamResponse(
              session.conversationHistory,
              async (token) => {
                await flushLanguageSwitch();
                socket.send(JSON.stringify({ type: "text", token, last: false }));
              },
              session.abortController.signal,
              fastify.log,
            );

            // Covers turns that produced no text at all, so the switch still applies to
            // the next one.
            await flushLanguageSwitch();

            socket.send(JSON.stringify({ type: "text", token: "", last: true }));

            if (endCall) {
              socket.send(
                JSON.stringify({
                  type: "end",
                  handoffData: JSON.stringify({ reason }),
                }),
              );
            }
          } catch (error) {
            if (error.name !== "AbortError" && error.name !== "APIUserAbortError") {
              fastify.log.error(error, "LLM streaming error");
              socket.send(
                JSON.stringify({
                  type: "text",
                  token: "I'm sorry, I'm having trouble processing that. Could you try again?",
                  last: true,
                }),
              );
            }
          }
          break;

        case "interrupt":
          fastify.log.info({ utteranceUntilInterrupt: message.utteranceUntilInterrupt }, "Caller interrupted");
          session = sessions.get(socket.callSid);
          if (session.abortController) {
            session.abortController.abort();
            session.abortController = null;
          }
          break;

        case "dtmf":
          fastify.log.info({ digit: message.digit }, "DTMF received");
          break;

        case "error":
          fastify.log.error({ description: message.description }, "ConversationRelay error");
          break;

        default:
          fastify.log.warn({ type: message.type }, "Unknown message type");
      }
    });

    socket.on("close", () => {
      fastify.log.info("WebSocket connection closed");
      const session = sessions.get(socket.callSid);
      if (session?.abortController) {
        session.abortController.abort();
      }
    });
  });
}
