const WELCOME_GREETING = `Thanks for calling Owl Airlines. How can I help you today?`;

// Language handling is demoed two ways, one endpoint each. The active mode is passed to
// the WebSocket server as a custom parameter so it knows whether to run its own language
// detection, and the starting language so it knows what it would be switching away from.
//
//   /twiml      automatic — ConversationRelay detects the language itself (language="multi")
//   /twiml-alt  manual    — the app detects the language and sends switch language messages
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
  // <Language> child here, and must be listed in SUPPORTED_LANGUAGES in services/llm.js.
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
      <Language code="de-DE" />
      <Language code="en-IN" />
      <Language code="en-GB" />
      <Language code="ja-JP" />
      <Language code="hi-IN" />
      <Language code="ta-IN" />
      <Language code="te-IN" />
      <Language code="ml-IN" />
      <Language code="kn-IN" />
      <Parameter name="languageMode" value="manual" />
      <Parameter name="startLanguage" value="en-US" />
    </ConversationRelay>
  </Connect>
</Response>`;

    // Extra Language for Bengali and Mandarint that I could not get to work
    // <Language code="bn-IN" transcriptionProvider="Deepgram" speechModel="nova-3-general" ttsProvider="ElevenLabs" voice="WiaIVvI1gDL4vT4y7qUU" />
    // <Language code="zh-TW" transcriptionProvider="Deepgram" speechModel="nova-3-general" ttsProvider="ElevenLabs" voice="4aW8bNY2tSD8eaHmuXZ0" />
    // <Language code="zh-CN" transcriptionProvider="Deepgram" speechModel="nova-3-general" ttsProvider="ElevenLabs" voice="D9bZgM9Er0PhIxuW9Jqa" />

    reply.type("text/xml").send(twiml);
  });
}
