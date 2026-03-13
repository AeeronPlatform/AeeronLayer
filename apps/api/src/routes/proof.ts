import { Router } from "express";
import { z } from "zod";
import { PublicKey } from "@solana/web3.js";
import { PaymentProof } from "@aeeron/sdk";
import { X402Codec } from "@aeeron/sdk";
import { validateBody } from "../middleware/validateBody";
import { getConnection, PROGRAM_ID } from "../lib/solana";

export const proofRouter = Router();

const CheckNonceSchema = z.object({
  nonce: z.string().length(64),
});

/**
 * POST /v1/proof/check-nonce
 * Check if a nonce has already been used (replay protection).
 */
proofRouter.post("/check-nonce", validateBody(CheckNonceSchema), async (req, res) => {
  const { nonce } = req.body;

  try {
    const nonceBuffer = Buffer.from(nonce, "hex");
    const [noncePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("nonce"), nonceBuffer],
      PROGRAM_ID
    );

    const connection = getConnection();
    const accountInfo = await connection.getAccountInfo(noncePda);

    res.json({
      nonce,
      pda: noncePda.toBase58(),
      used: accountInfo !== null,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(400).json({ error: "Invalid nonce format" });
  }
});

const DecodeProofSchema = z.object({
  encoded: z.string().min(1),
});

/**
 * POST /v1/proof/decode
 * Decode a base64-encoded X-Payment-Proof header for debugging.
 */
proofRouter.post("/decode", validateBody(DecodeProofSchema), (req, res) => {
  const { encoded } = req.body;

  try {
    const proof = X402Codec.decodePaymentProof(encoded);
    res.json({ proof });
  } catch {
    res.status(400).json({ error: "Invalid proof encoding" });
  }
});

const DecodeDetailsSchema = z.object({
  encoded: z.string().min(1),
});

/**
 * POST /v1/proof/decode-details
 * Decode a base64-encoded X-Payment-Details header.
 */
proofRouter.post("/decode-details", validateBody(DecodeDetailsSchema), (req, res) => {
  const { encoded } = req.body;

  try {
    const details = X402Codec.decodePaymentDetails(encoded);
    const now = Math.floor(Date.now() / 1000);
    res.json({
      details,
      expired: details.expiry < now,
      expiresInSeconds: details.expiry - now,
    });
  } catch {
    res.status(400).json({ error: "Invalid details encoding" });
  }
});
