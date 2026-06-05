import type { IncomingMessage } from 'http';
  import type { WebSocket, WebSocketServer } from 'ws';
  import { eventBus, type AeeronEvent } from './EventBus';
  import { logger } from '../logger';

  interface WsClient {
    ws:       WebSocket;
    agentId?: string;   // optional subscription filter
    connectedAt: string;
  }

  /**
   * WsHub
   *
   * Bridges the EventBus to WebSocket clients.
   *
   * Clients connect to ws://gateway/v1/events and optionally send:
   *   { "subscribe": "agent_summarizer_v1" }
   * to receive only events for a specific agent.
   *
   * All events are broadcast as JSON text frames.
   */
  export class WsHub {
    private clients = new Set<WsClient>();
    private unsub:  () => void;

    constructor(private wss: WebSocketServer) {
      this.unsub = eventBus.on('*', (event) => this.broadcast(event));
      wss.on('connection', (ws: WebSocket, req: IncomingMessage) => this.onConnect(ws, req));
    }

    private onConnect(ws: WebSocket, req: IncomingMessage) {
      const client: WsClient = { ws, connectedAt: new Date().toISOString() };
      this.clients.add(client);

      logger.info({ ip: req.socket.remoteAddress, total: this.clients.size }, 'ws client connected');

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.subscribe && typeof msg.subscribe === 'string') {
            client.agentId = msg.subscribe;
            ws.send(JSON.stringify({ type: 'subscribed', agentId: msg.subscribe }));
          }
          if (msg.unsubscribe) {
            client.agentId = undefined;
            ws.send(JSON.stringify({ type: 'unsubscribed' }));
          }
        } catch { /* ignore malformed messages */ }
      });

      ws.on('close', () => {
        this.clients.delete(client);
        logger.info({ total: this.clients.size }, 'ws client disconnected');
      });

      ws.on('error', (err) => {
        logger.warn({ err: err.message }, 'ws client error');
        this.clients.delete(client);
      });

      // Send welcome frame
      ws.send(JSON.stringify({ type: 'connected', serverTime: new Date().toISOString() }));
    }

    private broadcast(event: AeeronEvent) {
      const payload = JSON.stringify(event);
      for (const client of this.clients) {
        if (client.ws.readyState !== 1 /* OPEN */) continue;
        // If subscribed to a specific agent, skip non-matching events
        if (client.agentId && event.agentId && client.agentId !== event.agentId) continue;
        client.ws.send(payload, (err) => {
          if (err) this.clients.delete(client);
        });
      }
    }

    stats() {
      return { connectedClients: this.clients.size };
    }

    destroy() {
      this.unsub();
      this.wss.close();
    }
  }
  