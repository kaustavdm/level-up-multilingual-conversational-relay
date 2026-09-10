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
  <Connect action="/transfer" method="POST">
    <ConversationRelay 
        url="wss://${host}/ws"
        welcomeGreeting="${WELCOME_GREETING}"
        ttsProvider="ElevenLabs"
        language="en-US"
        ${intelligenceServiceSid ? `intelligenceService="${intelligenceServiceSid}"` : ""} />
  </Connect>
</Response>`;

    reply.type("text/xml").send(twiml);
  });

  // Handle transfer after conversationRelay ends
  fastify.all("/transfer", async (request, reply) => {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play loop="1">https://demo.twilio.com/docs/classic.mp3</Play>
</Response>`;

    reply.type("text/xml").send(twiml);
  });
}
