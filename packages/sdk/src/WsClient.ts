import type { AeeronEvent } from './types';

  type EventHandler = (event: AeeronEvent) => void;

  export interface WsClientOptions {
    /** Gateway WebSocket URL, e.g. wss://gateway.aeeron.xyz/v1/events */
    url:         string;
    /** Subscribe to events for a specific agent only. */
    agentId?:    string;
    /** Auto-reconnect on disconnect (default: true). */
    reconnect?:  boolean;
    /** Reconnect backoff base in ms (default: 1000). */
    backoffMs?:  number;
  }

  /**
   * WsClient
   *
   * Subscribe to real-time Aeeron gateway events from Node.js or the browser.
   *
   * Usage:
   *   const ws = new WsClient({ url: 'wss://gateway.aeeron.xyz/v1/events', agentId: 'agent_summarizer_v1' });
   *   ws.on('payment.settled', (e) => console.log('paid:', e.data));
   *   await ws.connect();
   *   // ...
   *   ws.close();
   */
  export class WsClient {
    private ws:        WebSocket | null = null;
    private handlers   = new Map<string, Set<EventHandler>>();
    private attempt    = 0;
    private closed     = false;
    private opts:      Required<WsClientOptions>;

    constructor(options: WsClientOptions) {
      this.opts = {
        url:        options.url,
        agentId:    options.agentId   ?? '',
        reconnect:  options.reconnect ?? true,
        backoffMs:  options.backoffMs ?? 1_000,
      };
    }

    on(type: string, handler: EventHandler): this {
      if (!this.handlers.has(type)) this.handlers.set(type, new Set());
      this.handlers.get(type)!.add(handler);
      return this;
    }

    off(type: string, handler: EventHandler): this {
      this.handlers.get(type)?.delete(handler);
      return this;
    }

    connect(): Promise<void> {
      return new Promise((resolve, reject) => {
        this.closed = false;
        const ws    = new WebSocket(this.opts.url);
        this.ws     = ws;

        ws.onopen = () => {
          this.attempt = 0;
          if (this.opts.agentId) {
            ws.send(JSON.stringify({ subscribe: this.opts.agentId }));
          }
          resolve();
        };

        ws.onmessage = (e) => {
          try {
            const event = JSON.parse(e.data as string) as AeeronEvent;
            const fns   = this.handlers.get(event.type);
            fns?.forEach((fn) => fn(event));
            this.handlers.get('*')?.forEach((fn) => fn(event));
          } catch { /* ignore */ }
        };

        ws.onerror = (err) => {
          if (this.attempt === 0) reject(err);
        };

        ws.onclose = () => {
          if (this.closed || !this.opts.reconnect) return;
          const delay = Math.min(this.opts.backoffMs * 2 ** this.attempt++, 30_000);
          setTimeout(() => this.connect().catch(() => {}), delay);
        };
      });
    }

    close() {
      this.closed = true;
      this.ws?.close();
      this.ws = null;
    }
  }
  