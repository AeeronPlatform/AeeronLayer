import nacl from "tweetnacl";
import bs58 from "bs58";
import type { PaymentProofData, PaymentDetailsData } from "../types";

interface ProofMessageInput {
  payer: string;
  payee: string;
  amount: number;
  nonce: string;
  expiry: number;
}

/**
 * PaymentProof — constructs and verifies x402 payment proof signatures.
 *
 * The signed message is a deterministic byte sequence:
 *   "AEERON_PROOF_V1:" + payer(32B) + payee(32B) + amount(8B LE) + nonce(32B) + expiry(8B LE)
 */
export class PaymentProof {
  static readonly PREFIX = Buffer.from("AEERON_PROOF_V1:");

  /**
   * Build the canonical message bytes that the payer signs.
   */
  static buildMessage(input: ProofMessageInput): Uint8Array {
    const payer = Buffer.from(bs58.decode(input.payer));
    const payee = Buffer.from(bs58.decode(input.payee));

    const amountBuf = Buffer.alloc(8);
    amountBuf.writeBigUInt64LE(BigInt(input.amount));

    const nonce = Buffer.from(input.nonce, "hex");

    const expiryBuf = Buffer.alloc(8);
    expiryBuf.writeBigInt64LE(BigInt(input.expiry));

    return Buffer.concat([
      this.PREFIX,
      payer,
      payee,
      amountBuf,
      nonce,
      expiryBuf,
    ]);
  }

  /**
   * Sign a payment proof message with the payer's keypair.
   */
  static sign(input: ProofMessageInput, secretKey: Uint8Array): string {
    const message = this.buildMessage(input);
    const signature = nacl.sign.detached(message, secretKey);
    return bs58.encode(signature);
  }

  /**
   * Verify a payment proof signature.
   */
  static verify(
    proof: PaymentProofData,
    details: PaymentDetailsData,
    payerPublicKey: string
  ): boolean {
    try {
      const message = this.buildMessage({
        payer: payerPublicKey,
        payee: details.payee,
        amount: details.amount,
        nonce: details.nonce,
        expiry: details.expiry,
      });

      const signatureBytes = bs58.decode(proof.signature);
      const publicKeyBytes = bs58.decode(payerPublicKey);

      return nacl.sign.detached.verify(message, signatureBytes, publicKeyBytes);
    } catch {
      return false;
    }
  }

  /**
   * Check if a proof is still within its valid time window.
   */
  static isExpired(proof: PaymentProofData, details: PaymentDetailsData): boolean {
    return Math.floor(Date.now() / 1000) > details.expiry;
  }
}
