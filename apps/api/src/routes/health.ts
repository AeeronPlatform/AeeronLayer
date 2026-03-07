import { Router } from "express";
import { getConnection } from "../lib/solana";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "0.1.0",
  });
});

healthRouter.get("/ready", async (_req, res) => {
  try {
    const connection = getConnection();
    const slot = await connection.getSlot("confirmed");

    res.json({
      status: "ready",
      solana: {
        connected: true,
        slot,
        network: process.env.SOLANA_NETWORK ?? "mainnet-beta",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: "not ready",
      error: "Solana RPC unavailable",
      timestamp: new Date().toISOString(),
    });
  }
});
