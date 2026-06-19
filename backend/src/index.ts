import Fastify from "fastify";
import cors from "@fastify/cors";

const app = Fastify({ logger: true });
const port = Number(process.env.PORT) || 4000;

await app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? true,
});

app.get("/health", async () => ({
  ok: true,
  service: "unpress-backend",
  version: "0.1.0",
}));

app.get("/api", async () => ({
  message: "Unpress backend API",
  endpoints: ["/health", "/api"],
}));

try {
  await app.listen({ port, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
