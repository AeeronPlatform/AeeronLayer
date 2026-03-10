import { Router } from "express";
import { z } from "zod";
import { X402Codec } from "@aeeron/sdk";
import { PaymentVerifier } from "@aeeron/sdk/server";
import { getConnection, NETWORK } from "../lib/solana";
import { validateBody } from "../middleware/validateBody";

export const paymentsRouter = Router();

const CreatePaymentDetailsSchema = z.object({
  payee: z.string().min(32).max(44),
  amount: z.number().int().positive(),
  token: z.enum(["SOL", "USDC"]).default("SOL"),
  ttlSeconds: z.number().int().min(60).max(3600).default(300),
  metadata: z.record(z.string()).optional(),
});

/**
 * POST /v1/payments/details
 * Generate a new x402 payment details object.
 * Resource servers call this to create the payload they include in 402 responses.
 */
paymentsRouter.post(
  "/details",
  validateBody(CreatePaymentDetailsSchema),
  (req, res) => {
    const { payee, amount, token, ttlSeconds } = req.body;

    const details = X402Codec.buildPaymentDetails({
      payee,
      amount,
      token,
      ttlSeconds,
      network: NETWORK,
    });

    const encoded = X402Codec.encodePaymentDetails(details);

    res.json({
      details,
      encoded,
      headers: {
        "X-Payment-Details": encoded,
        "X-Payment-Version": "1",
        "X-Payment-Network": NETWORK,
      },
    });
  }
);

const VerifyPaymentSchema = z.object({
  proof: z.string().min(1),
  payee: z.string().min(32).max(44),
  amount: z.number().int().positive(),
  token: z.enum(["SOL", "USDC"]).default("SOL"),
});

/**
 * POST /v1/payments/verify
 * Verify an x402 payment proof submitted by an agent.
 */
paymentsRouter.post(
  "/verify",
  validateBody(VerifyPaymentSchema),
  async (req, res) => {
    const { proof, payee, amount, token } = req.body;

    const verifier = new PaymentVerifier({
      payee,
      amount,
      token,
      network: NETWORK,
      rpcUrl: process.env.SOLANA_RPC_URL,
      skipVerification: process.env.NODE_ENV === "development",
    });

    const result = await verifier.verify(proof);

    if (!result.valid) {
      res.status(402).json({
        valid: false,
        error: result.error,
      });
      return;
    }

    res.json({
      valid: true,
      payer: result.payerAddress,
      amount: result.amount,
      txHash: result.txHash,
      verifiedAt: new Date().toISOString(),
    });
  }
);

/**
 * GET /v1/payments/:txHash
 * Look up a payment by its Solana transaction hash.
 */
paymentsRouter.get("/:txHash", async (req, res) => {
  const { txHash } = req.params;

  try {
    const connection = getConnection();
    const tx = await connection.getTransaction(txHash, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    res.json({
      txHash,
      slot: tx.slot,
      blockTime: tx.blockTime,
      fee: tx.meta?.fee,
      status: tx.meta?.err ? "failed" : "confirmed",
      confirmations: "max",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch transaction" });
  }
});
