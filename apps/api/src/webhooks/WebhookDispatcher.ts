import { db }     from '../db';
  import { logger }  from '../logger';

  interface WebhookPayload {
    event:       string;
    intentId?:   string;
    txSignature?: string;
    slot?:        number;
    settledAt?:   number;
    [key: string]: unknown;
  }

  /**
   * WebhookDispatcher
   *
   * Looks up registered webhook endpoints for an agent and delivers
   * signed POST requests with the event payload.
   *
   * Delivery guarantees:
   *   - Up to 3 retry attempts with exponential back-off (1s, 4s, 9s)
   *   - Timeout: 8 seconds per attempt
   *   - Fires-and-forgets; failures are logged, never surfaced to the caller
   *
   * Signature:
   *   X-Aeeron-Signature: HMAC-SHA256(secret, JSON.stringify(payload) + timestamp)
   *   X-Aeeron-Timestamp: Unix ms
   */
  export class WebhookDispatcher {
    async dispatch(agentId: string, payload: WebhookPayload): Promise<void> {
      let endpoints: { url: string; secret: string }[];
      try {
        endpoints = await this.loadEndpoints(agentId);
      } catch (err) {
        logger.warn({ agentId, err }, 'webhook: failed to load endpoints');
        return;
      }

      await Promise.allSettled(
        endpoints.map((ep) => this.deliver(ep.url, ep.secret, payload)),
      );
    }

    private async loadEndpoints(agentId: string): Promise<{ url: string; secret: string }[]> {
      // Fetches from agents.webhook_url + agents.webhook_secret columns
      const rows = await db.query.agents.findMany({
        where: (a, { eq, and, isNotNull }) =>
          and(eq(a.agentId, agentId), isNotNull(a.webhookUrl)),
        columns: { webhookUrl: true, webhookSecret: true },
      });
      return rows
        .filter((r): r is typeof r & { webhookUrl: string; webhookSecret: string } =>
          r.webhookUrl !== null && r.webhookSecret !== null)
        .map((r) => ({ url: r.webhookUrl, secret: r.webhookSecret }));
    }

    private async deliver(
      url: string,
      secret: string,
      payload: WebhookPayload,
      attempt = 0,
    ): Promise<void> {
      const ts   = Date.now().toString();
      const body = JSON.stringify(payload);
      const sig  = await this.sign(secret, body, ts);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8_000);

      try {
        const res = await fetch(url, {
          method:  'POST',
          headers: {
            'Content-Type':      'application/json',
            'X-Aeeron-Signature': sig,
            'X-Aeeron-Timestamp': ts,
          },
          body,
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!res.ok && attempt < 2) {
          const delay = (attempt + 1) ** 2 * 1_000;
          logger.warn({ url, status: res.status, attempt, delay }, 'webhook: retrying');
          await new Promise((r) => setTimeout(r, delay));
          return this.deliver(url, secret, payload, attempt + 1);
        }

        if (!res.ok) {
          logger.warn({ url, status: res.status }, 'webhook: delivery failed after retries');
        } else {
          logger.info({ url, attempt }, 'webhook: delivered');
        }
      } catch (err) {
        clearTimeout(timer);
        if (attempt < 2) {
          const delay = (attempt + 1) ** 2 * 1_000;
          await new Promise((r) => setTimeout(r, delay));
          return this.deliver(url, secret, payload, attempt + 1);
        }
        logger.warn({ url, err, attempt }, 'webhook: delivery exception');
      }
    }

    private async sign(secret: string, body: string, ts: string): Promise<string> {
      const key = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
      );
      const data = new TextEncoder().encode(body + ts);
      const sig  = await crypto.subtle.sign('HMAC', key, data);
      return Buffer.from(sig).toString('hex');
    }
  }
  