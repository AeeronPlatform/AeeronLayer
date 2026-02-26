import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { logger } from "./lib/logger";
import { router } from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { rateLimiter } from "./middleware/rateLimiter";

export async function createApp(): Promise<Express> {
  const app = express();

  // Trust proxy (for rate limiting behind load balancers)
  app.set("trust proxy", 1);

  // Security headers
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
  }));

  // CORS
  app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(",") ?? "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Payment-Proof",
      "X-Payment-Details",
      "X-Payment-Version",
      "X-Payment-Network",
    ],
    exposedHeaders: [
      "X-Payment-Details",
      "X-Payment-Version",
      "X-Payment-Network",
    ],
  }));

  // Request logging
  app.use(pinoHttp({ logger }));

  // Body parsing
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));

  // Rate limiting
  app.use(rateLimiter);

  // Routes
  app.use("/", router);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
