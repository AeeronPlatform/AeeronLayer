import { z } from "zod";

export const X402NetworkSchema = z.enum(["mainnet-beta", "devnet", "localnet"]);

export const X402PaymentDetailsSchema = z.object({
  payee: z.string().min(32).max(44),
  amount: z.number().int().positive(),
  token: z.string().min(1),
  nonce: z.string().length(64, "Nonce must be a 32-byte hex string (64 chars)"),
  expiry: z.number().int().positive(),
  network: X402NetworkSchema,
  version: z.literal(1),
});

export const X402PaymentProofSchema = z.object({
  signature: z.string().min(64).max(128),
  txHash: z.string().min(64).max(128),
  nonce: z.string().length(64),
  timestamp: z.number().int().positive(),
});

export type X402PaymentDetailsInput = z.input<typeof X402PaymentDetailsSchema>;
export type X402PaymentProofInput = z.input<typeof X402PaymentProofSchema>;
