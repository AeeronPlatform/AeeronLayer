import { IntentBuilder }  from './IntentBuilder';
  import type { Intent }      from '@aeeron/protocol';

  export interface AeeronClientOptions {
    /** Base URL of the Aeeron Gateway API, e.g. https://api.aeeron.xyz */
    gatewayUrl:   string;
    /** Session token for HMAC intent signing (keep server-side) */
    sessionToken: string;
    /** Agent wallet public key (base58) */
    wallet:       string;
    /** Agent ID registered on the Gateway */
    agentId:      string;
  }

  export interface PayResult {
    ok:           true;
    txSignature:  string;
    slot:         number;
  }

  export interface PayError {
    ok:    false;
    error: string;
    code:  string;
  }

  export interface StatusResult {
    settled:      boolean;
    intentId:     string;
    txSignature?: string;
    slot?:        number;
    settledAt?:   number;
  }

  /**
   * AeeronClient
   *
   * Minimal TypeScript SDK for agent-to-agent x402 payments via the Aeeron Gateway.
   *
   * @example
   * const client = new AeeronClient({
   *   gatewayUrl:   'https://api.aeeron.xyz',
   *   sessionToken: process.env.AEERON_SESSION_TOKEN!,
   *   wallet:       myKeypair.publicKey.toBase58(),
   *   agentId:      'agent_summarizer_v1',
   * });
   *
   * const result = await client.pay({
   *   recipient:   recipientPubkey,
   *   capability:  'summarize',
   *   maxLamports: 100_000n,
   *   rail:        'sol',
   * });
   */
  export class AeeronClient {
    private opts: AeeronClientOptions;

    constructor(opts: AeeronClientOptions) {
      this.opts = opts;
    }

    /**
     * pay
     *
     * Builds a signed intent and submits it to the Gateway for on-chain settlement.
     * Returns txSignature + slot on success.
     */
    async pay(args: {
      recipient:   string;
      capability:  string;
      payload?:    Record<string, unknown>;
      maxLamports: bigint;
      rail?:       'sol' | 'spl';
      ttl?:        number;
    }): Promise<PayResult | PayError> {
      const intent = new IntentBuilder()
        .payer(this.opts.wallet)
        .recipient(args.recipient)
        .agent(this.opts.agentId)
        .capability(args.capability, args.payload ?? {})
        .maxAmount(args.maxLamports)
        .rail(args.rail ?? 'sol')
        .ttl(args.ttl ?? 60_000)
        .build(this.opts.sessionToken);

      const res = await fetch(`${this.opts.gatewayUrl}/api/gateway/pay`, {
        method:  'POST',
        headers: {
          'Content-Type':    'application/json',
          'X-402-Payment':   JSON.stringify({ ...intent, maxAmountLamports: intent.maxAmountLamports.toString() }),
        },
        body: '{}',
      });

      const json = await res.json() as Record<string, unknown>;

      if (res.ok) {
        return { ok: true, txSignature: json['txSignature'] as string, slot: json['slot'] as number };
      }
      return { ok: false, error: json['error'] as string, code: json['code'] as string };
    }

    /**
     * status
     *
     * Polls the Gateway for on-chain settlement status of a given intentId.
     * Agents receiving payments use this to confirm finality before delivering service.
     */
    async status(intentId: string): Promise<StatusResult> {
      const res  = await fetch(`${this.opts.gatewayUrl}/api/gateway/status/${intentId}`);
      const json = await res.json() as Record<string, unknown>;
      return {
        settled:     (json['settled'] as boolean) ?? false,
        intentId,
        txSignature: json['txSignature'] as string | undefined,
        slot:        json['slot']        as number | undefined,
        settledAt:   json['settledAt']   as number | undefined,
      };
    }

    /**
     * waitForSettlement
     *
     * Polls status until settled or timeout (default 30s, 1s interval).
     * Throws if timeout is reached without confirmation.
     */
    async waitForSettlement(intentId: string, timeoutMs = 30_000): Promise<StatusResult> {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const s = await this.status(intentId);
        if (s.settled) return s;
        await new Promise((r) => setTimeout(r, 1_000));
      }
      throw new Error(`AeeronClient: settlement timeout for intentId ${intentId}`);
    }
  }
  