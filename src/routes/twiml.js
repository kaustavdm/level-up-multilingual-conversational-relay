import { LANGUAGES, LANGUAGE_TWIML_ATTRIBUTES } from "../services/languages.js";

const WELCOME_GREETING = `Thanks for calling Owl Airlines. How can I help you today?`;

// One <Language> noun per entry, carrying whichever per-language provider and voice
// settings the entry defines.
function renderLanguageElements(indent) {
  return LANGUAGES.map((language) => {
    const attributes = ["code", ...LANGUAGE_TWIML_ATTRIBUTES]
      .filter((name) => language[name])
      .map((name) => `${name}="${language[name]}"`)
      .join(" ");
    return `${indent}<Language ${attributes} />`;
  }).join("\n");
}

// Language handling is demoed two ways, one endpoint each. The active mode is passed to
// the WebSocket server as a custom parameter so it knows whether to run its own language
// detection, and the starting language so it knows what it would be switching away from.
//
//   /twiml        manual    — the app detects the language and sends switch language messages
//   /twiml-multi  automatic — ConversationRelay detects the language itself (language="multi")
//
// Point the phone number's incoming voice webhook at whichever behaviour you want to show.
export default async function twimlRoute(fastify) {
  // Automatic language detection. Requires transcriptionProvider="Deepgram" and
  // ttsProvider="ElevenLabs"; other providers with "multi" end the session.
  fastify.all("/twiml-multi", async (request, reply) => {
    const host = request.headers.host;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect method="POST">
    <ConversationRelay
        url="wss://${host}/ws"
        welcomeGreeting="${WELCOME_GREETING}"
        transcriptionProvider="Deepgram"
        speechModel="nova-3-general"
        ttsProvider="ElevenLabs"
        language="multi">
      <Parameter name="languageMode" value="multi" />
      <Parameter name="startLanguage" value="multi" />
    </ConversationRelay>
  </Connect>
</Response>`;

    reply.type("text/xml").send(twiml);
  });

  // Manual language switching. Every language the app may switch to must be declared as a
  // <Language> child, so the children are generated from services/languages.js — the same
  // list detectCallerLanguage picks from.
  fastify.all("/twiml", async (request, reply) => {
    const host = request.headers.host;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect method="POST">
    <ConversationRelay
        url="wss://${host}/ws"
        welcomeGreeting="${WELCOME_GREETING}"
        transcriptionProvider="Google"
        language="en-US">
${renderLanguageElements("      ")}
      <Parameter name="languageMode" value="manual" />
      <Parameter name="startLanguage" value="en-US" />
    </ConversationRelay>
  </Connect>
</Response>`;

    reply.type("text/xml").send(twiml);
  });
}
