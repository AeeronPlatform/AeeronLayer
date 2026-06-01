import crypto from 'crypto';
  import { logger } from './logger';

  export interface WebhookPayload {
    event:     'payment.accepted' | 'payment.rejected' | 'channel.opened' | 'channel.settled' | 'channel.closed';
    timestamp: string;
    data:      Record<string, unknown>;
  }

  export interface WebhookEndpoint {
    id:        string;
    url:       string;
    secret:    string;
    events:    WebhookPayload['event'][];
    createdAt: string;
  }

  // In-memory store (replace with DB in production)
  const endpoints = new Map<string, WebhookEndpoint>();

  function sign(payload: string, secret: string): string {
    return 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  export function registerEndpoint(url: string, secret: string, events: WebhookPayload['event'][]): WebhookEndpoint {
    const id = crypto.randomUUID();
    const ep: WebhookEndpoint = { id, url, secret, events, createdAt: new Date().toISOString() };
    endpoints.set(id, ep);
    return ep;
  }

  export function getEndpoint(id: string): WebhookEndpoint | undefined {
    return endpoints.get(id);
  }

  export function listEndpoints(): WebhookEndpoint[] {
    return [...endpoints.values()];
  }

  export function removeEndpoint(id: string): boolean {
    return endpoints.delete(id);
  }

  export async function dispatch(payload: WebhookPayload): Promise<void> {
    const body = JSON.stringify(payload);
    const targets = [...endpoints.values()].filter((ep) => ep.events.includes(payload.event));

    await Promise.allSettled(
      targets.map(async (ep) => {
        const sig = sign(body, ep.secret);
        try {
          const res = await fetch(ep.url, {
            method:  'POST',
            headers: {
              'Content-Type':      'application/json',
              'X-Aeeron-Signature': sig,
              'X-Aeeron-Event':    payload.event,
              'X-Aeeron-Delivery': crypto.randomUUID(),
            },
            body,
            signal: AbortSignal.timeout(10_000),
          });
          logger.info({ epId: ep.id, event: payload.event, status: res.status }, 'webhook delivered');
        } catch (err) {
          logger.warn({ epId: ep.id, event: payload.event, err }, 'webhook delivery failed');
        }
      }),
    );
  }
  