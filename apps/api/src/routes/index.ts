import { Router } from "express";
import { healthRouter } from "./health";
import { paymentsRouter } from "./payments";
import { channelsRouter } from "./channels";
import { proofRouter } from "./proof";

export const router = Router();

router.use("/health", healthRouter);
router.use("/v1/payments", paymentsRouter);
router.use("/v1/channels", channelsRouter);
router.use("/v1/proof", proofRouter);

router.get("/", (_req, res) => {
  res.json({
    name: "Aeeron Gateway API",
    version: "0.1.0",
    protocol: "x402",
    docs: "https://docs.aeeron.xyz",
    endpoints: {
      health: "/health",
      payments: "/v1/payments",
      channels: "/v1/channels",
      proof: "/v1/proof",
    },
  });
});
