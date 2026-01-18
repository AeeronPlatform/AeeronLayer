import type { PaymentDetailsData, PaymentProofData } from "../types";

/**
 * X402Codec — encodes and decodes x402 payment headers.
 *
 * Header format: base64(JSON)
 * This keeps the protocol HTTP-friendly while preserving binary safety.
 */
export class X402Codec {
  /**
   * Decode the X-Payment-Details header into a PaymentDetailsData object.
   */
  static decodePaymentDetails(header: string): PaymentDetailsData {
    try {
      const json = Buffer.from(header, "base64").toString("utf-8");
      const parsed = JSON.parse(json) as PaymentDetailsData;
      return parsed;
    } catch (err) {
      throw new Error(`Invalid X-Payment-Details header: ${err}`);
    }
  }

  /**
   * Encode a PaymentDetailsData object into the X-Payment-Details header value.
   */
  static encodePaymentDetails(details: PaymentDetailsData): string {
    return Buffer.from(JSON.stringify(details)).toString("base64");
  }

  /**
   * Decode the X-Payment-Proof header into a PaymentProofData object.
   */
  static decodePaymentProof(header: string): PaymentProofData {
    try {
      const json = Buffer.from(header, "base64").toString("utf-8");
      return JSON.parse(json) as PaymentProofData;
    } catch (err) {
      throw new Error(`Invalid X-Payment-Proof header: ${err}`);
    }
  }

  /**
   * Encode a PaymentProofData object into the X-Payment-Proof header value.
   */
  static encodePaymentProof(proof: PaymentProofData): string {
    return Buffer.from(JSON.stringify(proof)).toString("base64");
  }

  /**
   * Build the canonical payment details for a resource server response.
   */
  static buildPaymentDetails(opts: {
    payee: string;
    amount: number;
    token?: string;
    ttlSeconds?: number;
    network?: string;
  }): PaymentDetailsData {
    const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex");
    const expiry = Math.floor(Date.now() / 1000) + (opts.ttlSeconds ?? 300);

    return {
      payee: opts.payee,
      amount: opts.amount,
      token: (opts.token ?? "SOL") as PaymentDetailsData["token"],
      nonce,
      expiry,
      network: (opts.network ?? "mainnet-beta") as PaymentDetailsData["network"],
      version: 1,
    };
  }
}
