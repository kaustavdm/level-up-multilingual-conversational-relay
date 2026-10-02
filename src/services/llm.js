import OpenAI from "openai";
import {
  getReservation,
  getFlightStatus,
  getBagStatus,
  getSeat,
} from "./airline-data.js";
import { LANGUAGES, SUPPORTED_LANGUAGES } from "./languages.js";

let client;

function getClient() {
  if (!client) client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  return client;
}

const MODEL = process.env.MODEL || "gpt-5-nano";

const LANGUAGE_DETECTION_PROMPT = `You detect which language a phone caller wants to be spoken to in.

You receive the language currently active on the call and the latest thing the caller said, as transcribed. Reply with exactly one token and nothing else:
- One language code from this list (code: language):
${LANGUAGES.map(({ code, name }) => `  ${code}: ${name}`).join("\n")}
- Or the word none

Reply with a code only when the caller should now be spoken to in a different language than the active one. Reply none when the active language is still right.

Decide using both the transcript and the active language:
- If the caller explicitly asks to be spoken to in a language (for example "can you talk in Hindi", "Kya aap Hindi mein baat kar sakte hain?"), return that language's code even when the request itself was made in another language.
- The transcriber runs in the active language, so speech in another language often arrives romanized or garbled rather than in its own script. Judge by vocabulary and grammar, not script. "Kya aap Hindi mein baat kar sakte hain" is Hindi even though it is written in Latin letters.
- A caller mixing a few English words into another language is normal conversation, not a language change. Return the code of the language carrying the sentence.
- A request may name only the language ("German, please"). Map the language name to its code from the list.
- If the caller asks for English without naming a variety, return none when any English is already active, and en-US otherwise.
- If the requested language is not in the list, return none.
- If you are unsure, return none.`;

export const SYSTEM_PROMPT = `You are the virtual assistant for Owl Airlines, a fictional airline. You help callers with reservations, flight status, seat assignments, and baggage questions.

Guidelines:
- Be concise and conversational. Callers are listening, not reading — keep responses to 1-2 sentences when possible.
- This is a voice conversation. Your responses will be read aloud by text-to-speech. Never use markdown, bullet points, numbered lists, arrows, asterisks, colons for lists, or any special characters. Write everything as natural spoken sentences.
- The conversation can be multi-lingual. Expect the caller to switch and mix languages. Respond in the language used by the caller. Mix languages naturally in your responses.
- Flight numbers start with OA. Reservation confirmation codes start with OWL. When reading a flight number or confirmation code aloud, spell it out character by character (for example "O A one two three", "O W L one hundred") so the caller hears each character clearly, regardless of language.
- Assume the caller is the customer on record for this call — you do not need to ask for a phone number or confirmation code to look them up.
- Use get_reservation to pull up the caller's current booking.
- Use get_flight_status for questions about departure time, on-time status, or where the flight is going.
- Use check_bag_status if the caller asks about baggage or does not know where their bag is.
- Use check_seat for seat assignment questions.
- Never invent reservation, flight, seat, or bag information. Only share data returned by the tools.
- If the caller sounds frustrated, briefly acknowledge how they feel before solving the problem.
- When the caller signals the conversation is finished (says goodbye, thanks and asks nothing more, or you have fully resolved their request and they've confirmed there's nothing else), call the end_call tool. The farewell_message argument is required and will be spoken to the caller as the last thing they hear, so make it a short, warm goodbye in the language the caller is using.`;

const tools = [
  {
    type: "function",
    name: "get_reservation",
    description:
      "Look up the caller's current Owl Airlines reservation and the associated trip details.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    type: "function",
    name: "get_flight_status",
    description:
      "Get the current status, origin, destination, and departure time for the caller's flight.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    type: "function",
    name: "check_bag_status",
    description:
      "Check the baggage status for the caller's active reservation (e.g. checked in, loaded on the aircraft, delayed).",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    type: "function",
    name: "check_seat",
    description:
      "Look up the caller's current seat assignment for their upcoming flight.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    type: "function",
    name: "end_call",
    description:
      "End the phone call. The farewell_message will be spoken to the caller before the call is hung up.",
    parameters: {
      type: "object",
      properties: {
        farewell_message: {
          type: "string",
          description:
            "A short, warm goodbye to speak to the caller in the language they are using, right before ending the call.",
        },
        reason: {
          type: "string",
          description:
            "Short reason the call is ending (e.g. 'caller said goodbye', 'request resolved').",
        },
      },
      required: ["farewell_message", "reason"],
    },
  },
];

function executeToolCall(name) {
  switch (name) {
    case "get_reservation":
      return JSON.stringify(getReservation());
    case "get_flight_status":
      return JSON.stringify(getFlightStatus());
    case "check_bag_status":
      return JSON.stringify(getBagStatus());
    case "check_seat":
      return JSON.stringify(getSeat());
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

/**
 * Detect whether the caller has switched language, using the same OpenAI client as the
 * main conversation turn. Kept deliberately small — no tools, no streaming, minimal
 * reasoning and a handful of output tokens — so it returns in a few hundred milliseconds
 * and can run concurrently with streamResponse.
 *
 * @param {string} voicePrompt Transcript of what the caller just said.
 * @param {string} currentLanguage Language code currently active on the call.
 * @param {object} log Fastify logger.
 * @returns {Promise<string|null>} A code from SUPPORTED_LANGUAGES to switch to, or null
 *   to stay on the current language. Never throws — detection failure leaves the call
 *   on its current language.
 */
export async function detectCallerLanguage(voicePrompt, currentLanguage, log) {
  if (!voicePrompt) return null;

  const start = Date.now();

  try {
    const response = await getClient().responses.create({
      model: MODEL,
      instructions: LANGUAGE_DETECTION_PROMPT,
      input: `Active language: ${currentLanguage}\nCaller said: ${voicePrompt}`,
      reasoning: { effort: "minimal" },
      text: { verbosity: "low" },
      // Reasoning tokens count against this cap, so leave headroom: a cap that truncates
      // before the code is emitted yields an empty output_text and no switch at all.
      max_output_tokens: 256,
    });

    const detected = (response.output_text || "").trim();
    const ms = Date.now() - start;

    if (!SUPPORTED_LANGUAGES.includes(detected)) {
      log.info({ detected, currentLanguage, ms }, "No language switch detected");
      return null;
    }

    if (detected === currentLanguage) {
      log.info({ detected, ms }, "Caller language unchanged");
      return null;
    }

    log.info({ from: currentLanguage, to: detected, ms }, "Caller language switch detected");
    return detected;
  } catch (error) {
    log.error(error, "Language detection failed, staying on current language");
    return null;
  }
}

export async function streamResponse(conversationHistory, onToken, signal, log) {
  while (true) {
    const stream = await getClient().responses.create({
      model: MODEL,
      instructions: SYSTEM_PROMPT,
      input: conversationHistory,
      tools,
      stream: true,
      reasoning: { effort: "low" },
      text: { verbosity: "low" },
    }, { signal });

    const toolCalls = [];
    let outputText = "";

    for await (const event of stream) {
      // Awaited so callers can gate the first token on other work — e.g. sending a
      // language switch message, which must reach Twilio before any speech it applies to.
      if (event.type === "response.output_text.delta") {
        await onToken(event.delta);
      }

      if (event.type === "response.output_text.done") {
        outputText = event.text;
      }

      if (event.type === "response.output_item.done" && event.item.type === "function_call") {
        toolCalls.push({
          callId: event.item.call_id,
          name: event.item.name,
          arguments: event.item.arguments,
        });
      }
    }

    if (toolCalls.length === 0) {
      log.info({ response: outputText }, "LLM response");
      if (outputText) {
        conversationHistory.push({ role: "assistant", content: outputText });
      }
      return { endCall: false };
    }

    let endCallReason = null;

    for (const tc of toolCalls) {
      log.info({ tool: tc.name, arguments: tc.arguments }, "LLM tool call");

      conversationHistory.push({
        type: "function_call",
        call_id: tc.callId,
        name: tc.name,
        arguments: tc.arguments,
      });

      const args = tc.arguments ? JSON.parse(tc.arguments) : {};

      if (tc.name === "end_call") {
        endCallReason = args.reason || "conversation complete";
        const farewell = args.farewell_message || "";
        if (farewell) {
          log.info({ farewell }, "Speaking farewell before ending call");
          await onToken(farewell);
          conversationHistory.push({ role: "assistant", content: farewell });
        }
        conversationHistory.push({
          type: "function_call_output",
          call_id: tc.callId,
          output: JSON.stringify({ ended: true }),
        });
        continue;
      }

      const result = executeToolCall(tc.name, args);
      log.info({ tool: tc.name, result }, "Tool result");

      conversationHistory.push({
        type: "function_call_output",
        call_id: tc.callId,
        output: result,
      });
    }

    if (endCallReason) {
      log.info({ reason: endCallReason }, "LLM requested end of call");
      return { endCall: true, reason: endCallReason };
    }

    // Loop continues — LLM will process tool results and respond
  }
}
