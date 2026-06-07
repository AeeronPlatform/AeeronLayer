import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
  } from '@solana/web3.js';
  import * as anchor from '@coral-xyz/anchor';
  import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
  import type { AeeronVerifier } from '../types/aeeron_verifier';
  import { verifyIntent }        from '@aeeron/protocol';
  import { eventBus }            from '../events/EventBus';
  import { WebhookDispatcher }   from '../webhooks/WebhookDispatcher';
  import { logger }              from '../logger';
  import type { Intent }         from '@aeeron/protocol';
  import idl from '../indexer/aeeron_verifier.json';

  const PROGRAM_ID    = new PublicKey('AEERnVer1fier111111111111111111111111111111');
  const SESSION_TOKEN = process.env.SESSION_TOKEN!;

  export type SettleResult =
    | { ok: true;  txSignature: string; slot: number }
    | { ok: false; error: string; code: string };

  /**
   * SettlementService
   *
   * Orchestrates the full x402 payment lifecycle:
   *   1. Verify off-chain HMAC intent signature
   *   2. Call aeeron-verifier Anchor program via CPI
   *   3. Await on-chain confirmation
   *   4. Emit EventBus event → WsHub → dashboard
   *   5. Dispatch webhook to the paying agent
   *
   * The Gateway keypair signs CPI calls on behalf of the protocol.
   * It is loaded from the GATEWAY_KEYPAIR_JSON env var (base64 JSON uint8 array).
   */
  export class SettlementService {
    private program:    Program<AeeronVerifier>;
    private connection: Connection;
    private gateway:    Keypair;
    private webhooks:   WebhookDispatcher;

    constructor() {
      this.connection = new Connection(
        process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com',
        'confirmed',
      );
      this.gateway = Keypair.fromSecretKey(
        Uint8Array.from(
          JSON.parse(
            Buffer.from(process.env.GATEWAY_KEYPAIR_JSON ?? '[]', 'base64').toString('utf8'),
          ),
        ),
      );

      const provider = new AnchorProvider(
        this.connection,
        new Wallet(this.gateway),
        { commitment: 'confirmed' },
      );
      this.program  = new Program(idl as Parameters<typeof Program>[0], provider) as Program<AeeronVerifier>;
      this.webhooks = new WebhookDispatcher();
    }

    async settle(intent: Intent): Promise<SettleResult> {
      // 1 — verify off-chain intent
      const check = verifyIntent(intent, SESSION_TOKEN);
      if (!check.ok) {
        return { ok: false, error: check.error, code: 'INTENT_INVALID' };
      }

      const intentIdBytes = Array.from(Buffer.from(intent.intentId));
      const [nonceRecord]   = PublicKey.findProgramAddressSync([Buffer.from('nonce'),   Buffer.from(intentIdBytes)], PROGRAM_ID);
      const [paymentRecord] = PublicKey.findProgramAddressSync([Buffer.from('payment'), Buffer.from(intentIdBytes)], PROGRAM_ID);

      const payer     = new PublicKey(intent.payer);
      const recipient = new PublicKey(intent.recipient);

      // 2 — build Anchor instruction
      const params = {
        intentId:       intentIdBytes,
        amountLamports: new anchor.BN(intent.maxAmountLamports),
        expiresAt:      new anchor.BN(Math.floor(intent.expiresAt / 1000)),
        agentIdHash:    Array.from(Buffer.alloc(32).fill(0)),
        capabilityHash: Array.from(Buffer.alloc(32).fill(0)),
      };

      try {
        let txSignature: string;
        let slot: number;

        if (intent.rail === 'sol') {
          txSignature = await this.program.methods
            .settleSol(params)
            .accounts({ payer, recipient, nonceRecord, paymentRecord, systemProgram: SystemProgram.programId })
            .rpc();
        } else {
          // SPL path — requires ATAs to be passed; omitted for brevity
          throw new Error('spl rail not yet supported in SettlementService');
        }

        // 3 — confirm and get slot
        const latestBlock = await this.connection.getLatestBlockhash();
        await this.connection.confirmTransaction(
          { signature: txSignature, ...latestBlock },
          'confirmed',
        );
        slot = (await this.connection.getSignatureStatus(txSignature)).value?.slot ?? 0;

        logger.info({ intentId: intent.intentId, txSignature, slot }, 'payment settled');

        // 4 — emit internal event
        eventBus.emit('payment.settled', {
          source: 'gateway',
          intentId:       intent.intentId,
          payer:          intent.payer,
          recipient:      intent.recipient,
          amountLamports: intent.maxAmountLamports.toString(),
          rail:           intent.rail,
          txSignature,
          slot,
          settledAt:      Date.now(),
        }, intent.agentId);

        // 5 — webhook
        void this.webhooks.dispatch(intent.agentId, {
          event:     'payment.settled',
          intentId:  intent.intentId,
          txSignature,
          slot,
          settledAt: Date.now(),
        });

        return { ok: true, txSignature, slot };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn({ intentId: intent.intentId, err: msg }, 'settlement failed');

        eventBus.emit('payment.failed', {
          source:    'gateway',
          intentId:  intent.intentId,
          error:     msg,
          failedAt:  Date.now(),
        }, intent.agentId);

        if (msg.includes('NonceAlreadyUsed'))  return { ok: false, error: msg, code: 'NONCE_USED' };
        if (msg.includes('IntentExpired'))     return { ok: false, error: msg, code: 'INTENT_EXPIRED' };
        return { ok: false, error: msg, code: 'ON_CHAIN_FAILED' };
      }
    }
  }
  