import { Connection, PublicKey, type ParsedTransactionWithMeta } from '@solana/web3.js';
  import { BorshCoder, EventParser } from '@coral-xyz/anchor';
  import { eventBus } from '../events/EventBus';
  import { logger } from '../logger';
  import idl from './aeeron_verifier.json';

  const PROGRAM_ID = new PublicKey('AEERnVer1fier111111111111111111111111111111');

  /**
   * OnChainIndexer
   *
   * Subscribes to confirmed transactions for the aeeron-verifier program
   * via WebSocket log subscription. Parses PaymentSettled events and
   * re-emits them on the internal EventBus so the WsHub broadcasts them
   * to dashboard clients in real time.
   *
   * Usage:
   *   const indexer = new OnChainIndexer(process.env.SOLANA_RPC_WS_URL!);
   *   await indexer.start();
   *   // on shutdown:
   *   await indexer.stop();
   */
  export class OnChainIndexer {
    private connection: Connection;
    private subscriptionId: number | null = null;
    private parser: EventParser;
    private coder:  BorshCoder;

    constructor(rpcWsUrl: string) {
      this.connection = new Connection(
        rpcWsUrl.replace(/^ws/, 'http'),
        { wsEndpoint: rpcWsUrl, commitment: 'confirmed' },
      );
      this.coder  = new BorshCoder(idl as Parameters<typeof BorshCoder>[0]);
      this.parser = new EventParser(PROGRAM_ID, this.coder);
    }

    async start(): Promise<void> {
      this.subscriptionId = this.connection.onLogs(
        PROGRAM_ID,
        async (logs, ctx) => {
          if (logs.err) return;
          try {
            await this.processLogs(logs.logs, ctx.slot);
          } catch (err) {
            logger.warn({ err }, 'indexer: failed to process logs');
          }
        },
        'confirmed',
      );
      logger.info({ programId: PROGRAM_ID.toBase58() }, 'on-chain indexer started');
    }

    private async processLogs(logs: string[], slot: number): Promise<void> {
      const events = [...this.parser.parseLogs(logs)];
      for (const event of events) {
        if (event.name !== 'PaymentSettled') continue;
        const d = event.data as {
          intentId:      number[];
          payer:         PublicKey;
          recipient:     PublicKey;
          amountLamports: bigint;
          rail:           { sol?: object; spl?: object };
          settledAt:     bigint;
        };
        const intentId = Buffer.from(d.intentId).toString('utf8');
        const agentId  = undefined; // resolved off-chain via intent store

        eventBus.emit('payment.settled', {
          source:         'on-chain',
          slot,
          intentId,
          payer:          d.payer.toBase58(),
          recipient:      d.recipient.toBase58(),
          amountLamports: d.amountLamports.toString(),
          rail:           d.rail.sol !== undefined ? 'sol' : 'spl',
          settledAt:      Number(d.settledAt) * 1_000,
        }, agentId);

        logger.info({ intentId, slot }, 'payment settled on-chain');
      }
    }

    async stop(): Promise<void> {
      if (this.subscriptionId !== null) {
        await this.connection.removeOnLogsListener(this.subscriptionId);
        this.subscriptionId = null;
      }
      logger.info('on-chain indexer stopped');
    }
  }
  