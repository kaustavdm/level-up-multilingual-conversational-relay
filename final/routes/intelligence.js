import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_API_KEY_SID,
  process.env.TWILIO_API_KEY_SECRET,
  { accountSid: process.env.TWILIO_ACCOUNT_SID },
);

export default async function intelligenceRoute(fastify) {
  fastify.post("/webhook/intelligence", async (request, reply) => {
    const { transcript_sid, service_sid } = request.body;

    fastify.log.info(
      { transcriptSid: transcript_sid, serviceSid: service_sid },
      "Conversational Intelligence webhook received",
    );

    // The webhook is a notification only — fetch operator results via the API.
    const results = await client.intelligence.v2
      .transcripts(transcript_sid)
      .operatorResults.list();

    for (const result of results) {
      fastify.log.info(
        {
          operatorName: result.name,
          operatorType: result.operatorType,
          predictedLabel: result.predictedLabel,
          predictedProbability: result.predictedProbability,
          textGenerationResults: result.textGenerationResults,
          jsonResults: result.jsonResults,
        },
        "Operator result",
      );
    }

    reply.status(200).send({ received: true });
  });
}
