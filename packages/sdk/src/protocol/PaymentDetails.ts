import { z } from "zod";
import type { PaymentDetailsData } from "../types";

const PaymentDetailsSchema = z.object({
  payee: z.string().min(32).max(44),
  amount: z.number().int().positive(),
  token: z.string(),
  nonce: z.string().length(64),
  expiry: z.number().int().positive(),
  network: z.enum(["mainnet-beta", "devnet", "localnet"]),
  version: z.literal(1),
});

/**
 * PaymentDetails — wraps, validates, and creates x402 payment detail objects.
 */
export class PaymentDetails {
  private readonly data: PaymentDetailsData;

  constructor(data: PaymentDetailsData) {
    const parsed = PaymentDetailsSchema.parse(data);
    this.data = parsed as PaymentDetailsData;
  }

  get payee(): string {
    return this.data.payee;
  }

  get amount(): number {
    return this.data.amount;
  }

  get token(): string {
    return this.data.token;
  }

  get nonce(): string {
    return this.data.nonce;
  }

  get expiry(): number {
    return this.data.expiry;
  }

  get network(): string {
    return this.data.network;
  }

  isExpired(): boolean {
    return Math.floor(Date.now() / 1000) > this.data.expiry;
  }

  toJSON(): PaymentDetailsData {
    return { ...this.data };
  }

  static fromJSON(data: unknown): PaymentDetails {
    return new PaymentDetails(PaymentDetailsSchema.parse(data) as PaymentDetailsData);
  }
}
