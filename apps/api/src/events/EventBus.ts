type EventType =
    | 'payment.settled'
    | 'payment.failed'
    | 'channel.opened'
    | 'channel.closed'
    | 'agent.registered'
    | 'agent.heartbeat'
    | 'session.opened'
    | 'session.closed';

  export interface AeeronEvent<T = unknown> {
    id:        string;
    type:      EventType;
    agentId?:  string;
    data:      T;
    timestamp: string;
  }

  type Listener<T = unknown> = (event: AeeronEvent<T>) => void;

  /**
   * EventBus
   *
   * In-process pub/sub for Aeeron gateway events.
   * Consumed by the WebSocket hub and webhook dispatcher.
   */
  class EventBus {
    private listeners = new Map<EventType | '*', Set<Listener>>();

    on<T = unknown>(type: EventType | '*', fn: Listener<T>): () => void {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type)!.add(fn as Listener);
      return () => this.listeners.get(type)?.delete(fn as Listener);
    }

    emit<T = unknown>(type: EventType, data: T, agentId?: string): void {
      const event: AeeronEvent<T> = {
        id:        crypto.randomUUID(),
        type,
        agentId,
        data,
        timestamp: new Date().toISOString(),
      };
      this.listeners.get(type)?.forEach((fn) => fn(event));
      this.listeners.get('*')?.forEach((fn) => fn(event));
    }
  }

  export const eventBus = new EventBus();
  