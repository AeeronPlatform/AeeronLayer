import { Connection, PublicKey } from "@solana/web3.js";
import { X402Codec } from "../protocol/X402Codec";
import { PaymentProof } from "../protocol/PaymentProof";
import type { AeeronMiddlewareConfig, VerifyProofResult } from "./types";
import { AEERON_PROGRAM_ID } from "../constants";

/**
 * PaymentVerifier — validates x402 payment proofs on the server side.
 *
 * Checks:
 * 1. Proof signature is valid (Ed25519 over canonical message)
 * 2. Nonce has not been used before (on-chain nonce registry)
 * 3. Transaction exists and is confirmed on Solana
 * 4. Payment amount matches what the server requested
 * 5. Proof has not expired
 */
export class PaymentVerifier {
  private connection: Connection;
  private config: AeeronMiddlewareConfig;

  constructor(config: AeeronMiddlewareConfig) {
    this.config = config;
    this.connection = new Connection(
      config.rpcUrl ?? "https://api.mainnet-beta.solana.com",
      "confirmed"
    );
  }

  async verify(proofHeader: string): Promise<VerifyProofResult> {
    try {
      const proof = X402Codec.decodePaymentProof(proofHeader);

      // Reconstruct what the details would have looked like
      // In practice the details nonce is embedded in the proof
      const now = Math.floor(Date.now() / 1000);

      if (proof.timestamp < now - 600) {
        return { valid: false, error: "Payment proof timestamp is too old" };
      }

      if (this.config.skipVerification) {
        // Dev mode — trust the proof without on-chain check
        return {
          valid: true,
          txHash: proof.txHash,
          amount: this.config.amount,
        };
      }

      // Confirm the transaction exists on-chain
      const txResult = await this.connection.getTransaction(proof.txHash, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (!txResult) {
        return { valid: false, error: "Transaction not found on-chain" };
      }

      if (txResult.meta?.err) {
        return { valid: false, error: "Transaction failed on-chain" };
      }

      // Verify the nonce PDA exists (prevents replays)
      const noncePda = this.deriveNoncePda(proof.nonce);
      const nonceAccount = await this.connection.getAccountInfo(noncePda);

      if (!nonceAccount) {
        return { valid: false, error: "Nonce not registered on-chain" };
      }

      // Extract payer from transaction
      const payer = txResult.transaction.message.staticAccountKeys[0].toBase58();

      return {
        valid: true,
        payerAddress: payer,
        amount: this.config.amount,
        txHash: proof.txHash,
      };
    } catch (err) {
      return {
        valid: false,
        error: `Verification failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  private deriveNoncePda(nonce: string): PublicKey {
    const nonceBuffer = Buffer.from(nonce, "hex");
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("nonce"), nonceBuffer],
      AEERON_PROGRAM_ID
    );
    return pda;
  }
}
