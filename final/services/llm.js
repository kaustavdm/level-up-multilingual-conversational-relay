import OpenAI from "openai";
import {
  getReservation,
  getFlightStatus,
  getBagStatus,
  getSeat,
} from "./airline-data.js";

let client;

function getClient() {
  if (!client) client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  return client;
}

const MODEL = process.env.MODEL || "gpt-5-nano";

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
- Always confirm details before making changes. This demo does not actually change reservations, so if the caller asks to change or cancel, explain that a live agent will need to complete the change and offer to note the request.
- Never invent reservation, flight, seat, or bag information. Only share data returned by the tools.
- If the caller sounds frustrated, briefly acknowledge how they feel before solving the problem.
- When the caller signals the conversation is finished (says goodbye, thanks and asks nothing more, or you have fully resolved their request and they've confirmed there's nothing else), first speak a short, warm farewell in the language the caller is using, and only then call the end_call tool with a brief reason. Do not call end_call without first saying goodbye.`;

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
      "End the phone call. Call this only after saying a spoken farewell to the caller, when the conversation is complete.",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description:
            "Short reason the call is ending (e.g. 'caller said goodbye', 'request resolved').",
        },
      },
      required: ["reason"],
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

export async function streamResponse(conversationHistory, onToken, signal, log) {
  while (true) {
    const stream = await getClient().responses.create({
      model: MODEL,
      instructions: SYSTEM_PROMPT,
      input: conversationHistory,
      tools,
      stream: true,
    }, { signal });

    const toolCalls = [];
    let outputText = "";

    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        onToken(event.delta);
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
