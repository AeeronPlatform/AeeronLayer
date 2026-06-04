import { useEffect, useRef, useState } from 'react';

  type EventType =
    | 'payment.settled'
    | 'payment.failed'
    | 'channel.opened'
    | 'channel.closed'
    | 'agent.registered'
    | 'agent.heartbeat'
    | 'session.opened'
    | 'session.closed';

  interface FeedEvent {
    id:        string;
    type:      EventType;
    agentId?:  string;
    data:      Record<string, unknown>;
    timestamp: string;
    source?:   'on-chain' | 'gateway';
  }

  const EVENT_META: Record<string, { label: string; color: string; dot: string }> = {
    'payment.settled':   { label: 'Payment settled',   color: 'text-emerald-400', dot: 'bg-emerald-400' },
    'payment.failed':    { label: 'Payment failed',    color: 'text-red-400',     dot: 'bg-red-400'     },
    'channel.opened':    { label: 'Channel opened',    color: 'text-indigo-400',  dot: 'bg-indigo-400'  },
    'channel.closed':    { label: 'Channel closed',    color: 'text-zinc-400',    dot: 'bg-zinc-500'    },
    'agent.registered':  { label: 'Agent registered',  color: 'text-amber-400',   dot: 'bg-amber-400'   },
    'agent.heartbeat':   { label: 'Agent heartbeat',   color: 'text-zinc-500',    dot: 'bg-zinc-600'    },
    'session.opened':    { label: 'Session opened',    color: 'text-sky-400',     dot: 'bg-sky-400'     },
    'session.closed':    { label: 'Session closed',    color: 'text-zinc-400',    dot: 'bg-zinc-500'    },
  };

  const SEED_EVENTS: FeedEvent[] = [
    { id:'1', type:'payment.settled',  agentId:'agent_summarizer_v1', data:{ amountLamports:'100000', rail:'sol' },   timestamp: new Date(Date.now()-8000).toISOString(),  source:'on-chain' },
    { id:'2', type:'channel.opened',   agentId:'agent_embedder_v2',   data:{ channelId:'ch_abc123' },                timestamp: new Date(Date.now()-22000).toISOString(), source:'gateway'  },
    { id:'3', type:'payment.settled',  agentId:'agent_embedder_v2',   data:{ amountLamports:'20000',  rail:'channel'},timestamp: new Date(Date.now()-35000).toISOString(), source:'on-chain' },
    { id:'4', type:'agent.registered', agentId:'agent_code_reviewer', data:{ version:'0.9.4' },                      timestamp: new Date(Date.now()-61000).toISOString(), source:'gateway'  },
    { id:'5', type:'session.opened',   agentId:'agent_summarizer_v1', data:{ sessionId:'sess_xyz' },                 timestamp: new Date(Date.now()-90000).toISOString(), source:'gateway'  },
  ];

  function timeAgo(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60)   return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    return `${Math.floor(s/3600)}h ago`;
  }

  function lamportsToSol(l: string) {
    return (Number(l) / 1e9).toFixed(6);
  }

  export default function LiveFeedPage() {
    const [events, setEvents] = useState<FeedEvent[]>(SEED_EVENTS);
    const [paused, setPaused] = useState(false);
    const [filter, setFilter] = useState<EventType | 'all'>('all');
    const [connected, setConnected] = useState(false);
    const pausedRef = useRef(paused);
    pausedRef.current = paused;

    // Simulate live events in demo mode (replace with real WsClient in production)
    useEffect(() => {
      const DEMO_TEMPLATES: Omit<FeedEvent, 'id' | 'timestamp'>[] = [
        { type:'payment.settled',  agentId:'agent_summarizer_v1', data:{ amountLamports:'100000', rail:'sol'     }, source:'on-chain' },
        { type:'payment.settled',  agentId:'agent_embedder_v2',   data:{ amountLamports:'20000',  rail:'channel' }, source:'on-chain' },
        { type:'agent.heartbeat',  agentId:'agent_summarizer_v1', data:{ lastSeen: new Date().toISOString()      }, source:'gateway'  },
        { type:'channel.opened',   agentId:'agent_embedder_v2',   data:{ channelId: 'ch_' + Math.random().toString(36).slice(2,8) }, source:'gateway' },
        { type:'session.opened',   agentId:'agent_summarizer_v1', data:{ sessionId: 'sess_' + Math.random().toString(36).slice(2,8) }, source:'gateway' },
        { type:'payment.failed',   agentId:'agent_code_reviewer', data:{ reason: 'insufficient_balance'         }, source:'gateway'  },
      ];

      setConnected(true);
      let idx = 0;
      const timer = setInterval(() => {
        if (pausedRef.current) return;
        const tmpl = DEMO_TEMPLATES[idx % DEMO_TEMPLATES.length];
        idx++;
        const event: FeedEvent = {
          ...tmpl,
          id:        crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          data:      { ...tmpl.data },
        };
        setEvents((prev) => [event, ...prev].slice(0, 200));
      }, 2_800);

      return () => { clearInterval(timer); setConnected(false); };
    }, []);

    const filtered = filter === 'all' ? events : events.filter((e) => e.type === filter);

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-white">Live Feed</h1>
              <span className={`flex items-center gap-1 text-xs ${connected ? 'text-emerald-400' : 'text-zinc-500'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-0.5">Real-time gateway and on-chain events via WebSocket.</p>
          </div>
          <button
            onClick={() => setPaused((p) => !p)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              paused
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
            }`}>
            {paused ? '▷ Resume' : '⏸ Pause'}
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {(['all', ...Object.keys(EVENT_META)] as (EventType | 'all')[]).map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                filter === t
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/6 text-zinc-400 hover:text-white'
              }`}>
              {t === 'all' ? 'All' : EVENT_META[t].label}
            </button>
          ))}
        </div>

        {/* Event list */}
        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
          {filtered.map((event) => {
            const meta = EVENT_META[event.type] ?? { label: event.type, color: 'text-zinc-400', dot: 'bg-zinc-500' };
            return (
              <div key={event.id}
                className="group flex items-start gap-3 rounded-xl border border-white/6 bg-white/3 px-4 py-3 hover:bg-white/5 transition-colors">
                <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${meta.dot}`} />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                    {event.source === 'on-chain' && (
                      <span className="rounded bg-indigo-500/15 px-1.5 py-px text-[9px] text-indigo-300">on-chain</span>
                    )}
                    {event.agentId && (
                      <span className="truncate text-[10px] text-zinc-600">{event.agentId}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-zinc-500">
                    {Object.entries(event.data).map(([k, v]) => (
                      <span key={k}>
                        <span className="text-zinc-600">{k}: </span>
                        <span className="text-zinc-400 font-mono">
                          {k === 'amountLamports' ? lamportsToSol(String(v)) + ' SOL' : String(v)}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
                <span className="flex-shrink-0 text-[10px] text-zinc-600">{timeAgo(event.timestamp)}</span>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-zinc-600">No events yet.</div>
          )}
        </div>
      </div>
    );
  }
  