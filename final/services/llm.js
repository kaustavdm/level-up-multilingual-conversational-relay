import OpenAI from "openai";
import { getRoutes, getSchedule } from "./transit-data.js";

let client;

function getClient() {
  if (!client) client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  return client;
}

const MODEL = process.env.MODEL || "gpt-5-mini";

export const SYSTEM_PROMPT = `You are Vanguard, the virtual assistant for Signal City Transit. You help callers with route information, schedules, and lost item reports.

Guidelines:
- Be concise and conversational. Callers are listening, not reading — keep responses to 1-2 sentences when possible.
- This is a voice conversation. Your responses will be read aloud by text-to-speech. Never use markdown, bullet points, numbered lists, arrows, asterisks, colons for lists, or any special characters. Write everything as natural spoken sentences.
- When describing multiple items, use natural speech like "We have three routes: Route 42 the TwiliTown Express, Route 7 the Ferry Line, and Route 15 the Metro Connect." Do not list them with dashes or bullets.
- Use the get_routes tool to answer questions about available routes.
- Use the get_schedule tool when asked about specific route timing or frequency.
- Use report_lost_item when a caller wants to report a lost item. Collect all required details _one by one_: their name, the route they were on, a description of the item, and a callback phone number.
- Use transfer_to_human when the caller explicitly asks to speak with a person or agent, or when you cannot fulfill their request.
- Never make up route or schedule information. Only share data returned by the tools.
- If a caller asks about something outside your capabilities, offer to transfer them to a human agent.`;

const tools = [
  {
    type: "function",
    name: "get_routes",
    description:
      "Get a list of all Signal City Transit routes with their stops and descriptions.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    type: "function",
    name: "get_schedule",
    description:
      "Get the schedule for a specific Signal City Transit route, including weekday and weekend service hours and frequency.",
    parameters: {
      type: "object",
      properties: {
        route_name: {
          type: "string",
          description:
            'The name or partial name of the route (e.g. "Ferry", "Route 42", "Metro")',
        },
      },
      required: ["route_name"],
    },
  },
  {
    type: "function",
    name: "report_lost_item",
    description:
      "Report a lost item on Signal City Transit. Collects caller details and creates a report.",
    parameters: {
      type: "object",
      properties: {
        caller_name: {
          type: "string",
          description: "The caller's name",
        },
        route_name: {
          type: "string",
          description: "The route the caller was on when they lost the item",
        },
        item_description: {
          type: "string",
          description: "Description of the lost item",
        },
        contact_phone: {
          type: "string",
          description: "Phone number to reach the caller about the item",
        },
      },
      required: [
        "caller_name",
        "route_name",
        "item_description",
        "contact_phone",
      ],
    },
  },
  {
    type: "function",
    name: "transfer_to_human",
    description:
      "Transfer the caller to a human agent. Use when the caller requests a person or when you cannot fulfill their request.",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Brief reason for the transfer",
        },
      },
      required: ["reason"],
    },
  },
];

function executeToolCall(name, args) {
  switch (name) {
    case "get_routes":
      return JSON.stringify(getRoutes());
    case "get_schedule": {
      const schedule = getSchedule(args.route_name);
      return schedule
        ? JSON.stringify(schedule)
        : JSON.stringify({ error: `No route found matching "${args.route_name}"` });
    }
    case "report_lost_item": {
      const refNumber = `SCT-LI-${Math.random().toString().slice(2, 8)}`;
      return JSON.stringify({
        success: true,
        reference_number: refNumber,
        message: `Lost item report created. Reference: ${refNumber}`,
        details: args,
      });
    }
    case "transfer_to_human":
      return JSON.stringify({ action: "transfer", reason: args.reason });
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
      conversationHistory.push({ role: "assistant", content: outputText });
      return { transferReason: null };
    }

    for (const tc of toolCalls) {
      log.info({ tool: tc.name, arguments: tc.arguments }, "LLM tool call");
    }

    // Execute tool calls and check for transfer
    let transferReason = null;

    for (const tc of toolCalls) {
      conversationHistory.push({
        type: "function_call",
        call_id: tc.callId,
        name: tc.name,
        arguments: tc.arguments,
      });

      const args = JSON.parse(tc.arguments);
      const result = executeToolCall(tc.name, args);
      log.info({ tool: tc.name, result }, "Tool result");

      conversationHistory.push({
        type: "function_call_output",
        call_id: tc.callId,
        output: result,
      });

      if (tc.name === "transfer_to_human") {
        transferReason = args.reason;
      }
    }

    if (transferReason) {
      return { transferReason };
    }

    // Loop continues — LLM will process tool results and respond
  }
}
