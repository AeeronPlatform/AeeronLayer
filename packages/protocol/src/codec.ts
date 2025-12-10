import type { X402PaymentDetails, X402PaymentProof } from "./types";
import { X402PaymentDetailsSchema, X402PaymentProofSchema } from "./schemas";

/**
 * Encode/decode x402 protocol headers.
 * Header wire format: base64(JSON)
 */
export const X402Codec = {
  encodeDetails(details: X402PaymentDetails): string {
    return Buffer.from(JSON.stringify(details)).toString("base64");
  },

  decodeDetails(encoded: string): X402PaymentDetails {
    const json = Buffer.from(encoded, "base64").toString("utf-8");
    return X402PaymentDetailsSchema.parse(JSON.parse(json)) as X402PaymentDetails;
  },

  encodeProof(proof: X402PaymentProof): string {
    return Buffer.from(JSON.stringify(proof)).toString("base64");
  },

  decodeProof(encoded: string): X402PaymentProof {
    const json = Buffer.from(encoded, "base64").toString("utf-8");
    return X402PaymentProofSchema.parse(JSON.parse(json)) as X402PaymentProof;
  },

  buildNonce(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Buffer.from(bytes).toString("hex");
  },

  buildExpiry(ttlSeconds = 300): number {
    return Math.floor(Date.now() / 1000) + ttlSeconds;
  },
};
