import "dotenv/config";
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import formbody from "@fastify/formbody";
import twimlRoute from "./routes/twiml.js";
import websocketRoute from "./routes/websocket.js";
import intelligenceRoute from "./routes/intelligence.js";

const requiredEnvVars = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_API_KEY_SID",
  "TWILIO_API_KEY_SECRET",
  "OPENAI_API_KEY",
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingVars.join(", ")}`,
  );
  process.exit(1);
}

const fastify = Fastify({ logger: { base: undefined } });
fastify.register(formbody);

await fastify.register(websocket);
await fastify.register(twimlRoute);
await fastify.register(websocketRoute);
await fastify.register(intelligenceRoute);

fastify.get("/health", async () => ({
  status: "OK",
  timestamp: new Date().toISOString(),
}));

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

try {
  await fastify.listen({ port: PORT, host: HOST });
  fastify.log.info(`Running: final`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

const shutdown = async (signal) => {
  fastify.log.info(`${signal} received, shutting down`);
  await fastify.close();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
