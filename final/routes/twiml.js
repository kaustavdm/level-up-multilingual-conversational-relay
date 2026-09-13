const WELCOME_GREETING=`Hi! This is Signal City Transit.
I'm Vanguard, your virtual assistant. How can I help you today?`;

export default async function twimlRoute(fastify) {

  // TwiML endpoint for ConversationRelay
  fastify.all("/twiml", async (request, reply) => {
    const host = request.headers.host;
    const intelligenceServiceSid =
      process.env.TWILIO_INTELLIGENCE_SERVICE_SID || "";

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect method="POST">
    <ConversationRelay 
        url="wss://${host}/ws"
        welcomeGreeting="${WELCOME_GREETING}"
        transcriptionProvider="Deepgram"
        speechModel="nova-3-general"
        ttsProvider="ElevenLabs"
        language="multi" />
  </Connect>
</Response>`;

    reply.type("text/xml").send(twiml);
  });

}
