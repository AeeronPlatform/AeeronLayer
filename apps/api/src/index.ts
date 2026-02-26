import "dotenv/config";
import { createApp } from "./app";
import { logger } from "./lib/logger";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const HOST = process.env.HOST ?? "0.0.0.0";

async function main() {
  const app = await createApp();

  const server = app.listen(PORT, HOST, () => {
    logger.info({ port: PORT, host: HOST }, "Aeeron Gateway API started");
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, "Received shutdown signal");
    server.close(() => {
      logger.info("Server closed cleanly");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error(err, "Fatal startup error");
  process.exit(1);
});
