import { Connection, PublicKey } from '@solana/web3.js';
  import { BorshAccountsCoder } from '@coral-xyz/anchor';
  import idl from './aeeron_verifier_idl.json';

  const PROGRAM_ID = new PublicKey('AEERnVer1fier111111111111111111111111111111');

  export interface PaymentRecord {
    intentId:       string;
    payer:          string;
    recipient:      string;
    amountLamports: bigint;
    rail:           'sol' | 'spl';
    settledAt:      number;  // Unix ms
    agentIdHash:    string;  // hex
    capabilityHash: string;  // hex
  }

  export type ProofResult =
    | { ok: true;  record: PaymentRecord }
    | { ok: false; error: string; code: 'NOT_FOUND' | 'DECODE_FAILED' | 'RPC_ERROR' };

  /**
   * ProofVerifier
   *
   * Allows the recipient agent to verify on-chain that an x402 payment
   * was fully settled before delivering a service.
   *
   * Reads the PaymentRecord PDA written by aeeron-verifier and returns
   * a typed, decoded record. No off-chain trust is required.
   *
   * Usage:
   *   const verifier = new ProofVerifier(process.env.SOLANA_RPC_URL!);
   *   const proof = await verifier.verify(intentId);
   *   if (!proof.ok) throw new Error(proof.error);
   *   if (proof.record.recipient !== myWallet) throw new Error('wrong recipient');
   *   // — safe to deliver service —
   */
  export class ProofVerifier {
    private connection: Connection;
    private coder:      BorshAccountsCoder;

    constructor(rpcUrl: string) {
      this.connection = new Connection(rpcUrl, 'confirmed');
      this.coder      = new BorshAccountsCoder(idl as Parameters<typeof BorshAccountsCoder>[0]);
    }

    async verify(intentId: string): Promise<ProofResult> {
      const idBytes = Buffer.from(intentId);

      const [recordPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('payment'), idBytes],
        PROGRAM_ID,
      );

      try {
        const accountInfo = await this.connection.getAccountInfo(recordPDA, 'confirmed');

        if (!accountInfo) {
          return { ok: false, error: `No PaymentRecord found for intentId "${intentId}"`, code: 'NOT_FOUND' };
        }

        const decoded = this.coder.decode('PaymentRecord', accountInfo.data);
        const record: PaymentRecord = {
          intentId:        Buffer.from(decoded.intentId as number[]).toString('utf8').replace(/\0/g, ''),
          payer:           (decoded.payer as PublicKey).toBase58(),
          recipient:       (decoded.recipient as PublicKey).toBase58(),
          amountLamports:  BigInt((decoded.amountLamports as { toString(): string }).toString()),
          rail:            (decoded.rail as { sol?: object }).sol !== undefined ? 'sol' : 'spl',
          settledAt:       Number(decoded.settledAt as bigint) * 1_000,
          agentIdHash:     Buffer.from(decoded.agentIdHash as number[]).toString('hex'),
          capabilityHash:  Buffer.from(decoded.capabilityHash as number[]).toString('hex'),
        };

        return { ok: true, record };
      } catch (err) {
        if (err instanceof Error && err.message.includes('AccountNotFound')) {
          return { ok: false, error: 'PaymentRecord account not found on-chain', code: 'NOT_FOUND' };
        }
        if (err instanceof Error && err.message.includes('decode')) {
          return { ok: false, error: 'Failed to decode PaymentRecord: ' + err.message, code: 'DECODE_FAILED' };
        }
        return { ok: false, error: String(err), code: 'RPC_ERROR' };
      }
    }

    /**
     * verifyAndAssert
     *
     * Convenience wrapper: resolves only if the payment is settled to the
     * expected recipient with at least minLamports. Throws otherwise.
     */
    async verifyAndAssert(args: {
      intentId:        string;
      expectedRecipient: string;
      minLamports?:    bigint;
    }): Promise<PaymentRecord> {
      const result = await this.verify(args.intentId);

      if (!result.ok) {
        throw new Error(`ProofVerifier[${result.code}]: ${result.error}`);
      }

      const { record } = result;

      if (record.recipient !== args.expectedRecipient) {
        throw new Error(
          `ProofVerifier: recipient mismatch — expected ${args.expectedRecipient}, got ${record.recipient}`,
        );
      }

      if (args.minLamports !== undefined && record.amountLamports < args.minLamports) {
        throw new Error(
          `ProofVerifier: insufficient payment — expected ≥${args.minLamports}, got ${record.amountLamports}`,
        );
      }

      return record;
    }
  }
  