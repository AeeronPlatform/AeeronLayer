import { useState } from 'react';

  interface Section {
    id:    string;
    label: string;
  }
  const SECTIONS: Section[] = [
    { id: 'gateway',  label: 'Gateway'  },
    { id: 'agent',    label: 'Agent'    },
    { id: 'webhooks', label: 'Webhooks' },
    { id: 'security', label: 'Security' },
  ];

  function Field({
    label, description, children,
  }: { label: string; description?: string; children: React.ReactNode }) {
    return (
      <div className="flex items-start justify-between gap-8 py-4 border-b border-white/5 last:border-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white">{label}</p>
          {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
        </div>
        <div className="flex-shrink-0 w-72">{children}</div>
      </div>
    );
  }

  function TextInput({ value, onChange, placeholder, mono }: {
    value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean;
  }) {
    return (
      <input
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 ${mono ? 'font-mono text-xs' : ''}`}
      />
    );
  }

  function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
    return (
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors ${enabled ? 'bg-indigo-600' : 'bg-white/10'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5 ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    );
  }

  function SecretInput({ value, onChange, placeholder }: {
    value: string; onChange: (v: string) => void; placeholder?: string;
  }) {
    const [show, setShow] = useState(false);
    return (
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 pr-10 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
        />
        <button onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs">
          {show ? 'hide' : 'show'}
        </button>
      </div>
    );
  }

  export default function SettingsPage() {
    const [active, setActive]   = useState('gateway');
    const [saved,  setSaved]    = useState(false);

    // Gateway
    const [gatewayUrl,   setGatewayUrl]   = useState('https://api.aeeron.xyz');
    const [rpcUrl,       setRpcUrl]       = useState('https://api.devnet.solana.com');
    const [cluster,      setCluster]      = useState<'devnet' | 'mainnet-beta'>('devnet');
    const [sessionToken, setSessionToken] = useState('');

    // Agent
    const [agentId,   setAgentId]   = useState('');
    const [wallet,    setWallet]    = useState('');
    const [endpoint,  setEndpoint]  = useState('');
    const [version,   setVersion]   = useState('1.0.0');

    // Webhooks
    const [webhookUrl,    setWebhookUrl]    = useState('');
    const [webhookSecret, setWebhookSecret] = useState('');
    const [webhookEnabled, setWebhookEnabled] = useState(false);

    // Security
    const [rateLimitEnabled, setRateLimitEnabled] = useState(true);
    const [maxRpm,           setMaxRpm]           = useState('120');
    const [ipWhitelist,      setIpWhitelist]      = useState('');

    function save() {
      setSaved(true);
      setTimeout(() => setSaved(false), 2_500);
    }

    return (
      <div className="flex gap-6">
        {/* Sidebar nav */}
        <nav className="w-36 flex-shrink-0 space-y-0.5 pt-1">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => setActive(s.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                active === s.id
                  ? 'bg-white/8 text-white font-medium'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}>
              {s.label}
            </button>
          ))}
        </nav>

        {/* Panel */}
        <div className="flex-1 min-w-0 space-y-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold text-white">Settings</h1>
            <button onClick={save}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white transition-colors">
              {saved ? '✓ Saved' : 'Save changes'}
            </button>
          </div>

          {active === 'gateway' && (
            <div>
              <Field label="Gateway URL" description="Base URL of the Aeeron Gateway API.">
                <TextInput value={gatewayUrl} onChange={setGatewayUrl} placeholder="https://api.aeeron.xyz" />
              </Field>
              <Field label="Solana RPC URL" description="RPC endpoint for on-chain queries and settlement.">
                <TextInput value={rpcUrl} onChange={setRpcUrl} mono placeholder="https://api.devnet.solana.com" />
              </Field>
              <Field label="Cluster" description="Target Solana cluster.">
                <select value={cluster} onChange={(e) => setCluster(e.target.value as typeof cluster)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                  <option value="devnet">Devnet</option>
                  <option value="mainnet-beta">Mainnet Beta</option>
                </select>
              </Field>
              <Field label="Session token" description="HMAC secret used to sign x402 intents. Keep server-side only.">
                <SecretInput value={sessionToken} onChange={setSessionToken} placeholder="sk_…" />
              </Field>
            </div>
          )}

          {active === 'agent' && (
            <div>
              <Field label="Agent ID" description="Unique identifier registered on the Gateway.">
                <TextInput value={agentId} onChange={setAgentId} mono placeholder="agent_my_service_v1" />
              </Field>
              <Field label="Wallet public key" description="Solana wallet that receives payments.">
                <TextInput value={wallet} onChange={setWallet} mono placeholder="Base58 public key" />
              </Field>
              <Field label="Agent endpoint" description="Public HTTPS URL the Gateway routes capability requests to.">
                <TextInput value={endpoint} onChange={setEndpoint} placeholder="https://my-agent.example.com" />
              </Field>
              <Field label="Version" description="Semantic version reported to the Gateway.">
                <TextInput value={version} onChange={setVersion} placeholder="1.0.0" />
              </Field>
            </div>
          )}

          {active === 'webhooks' && (
            <div>
              <Field label="Enable webhooks" description="Receive signed POST events when payments settle or fail.">
                <Toggle enabled={webhookEnabled} onChange={setWebhookEnabled} />
              </Field>
              <Field label="Webhook URL" description="Endpoint that receives payment.settled / payment.failed events.">
                <TextInput value={webhookUrl} onChange={setWebhookUrl} placeholder="https://my-agent.example.com/webhooks/aeeron" />
              </Field>
              <Field label="Webhook secret" description="Used to verify X-Aeeron-Signature on incoming events.">
                <SecretInput value={webhookSecret} onChange={setWebhookSecret} placeholder="whsec_…" />
              </Field>
              <div className="mt-4 rounded-xl border border-white/6 bg-white/3 px-4 py-3 text-xs text-zinc-500 space-y-1">
                <p className="text-zinc-400 font-medium">Verification example (Node.js)</p>
                <pre className="font-mono text-[10px] text-zinc-500 overflow-x-auto">{
  `const sig = req.headers['x-aeeron-signature'];
  const ts  = req.headers['x-aeeron-timestamp'];
  const expected = hmacSha256(secret, body + ts);
  if (sig !== expected) return res.sendStatus(401);`
                }</pre>
              </div>
            </div>
          )}

          {active === 'security' && (
            <div>
              <Field label="Rate limiting" description="Enforce per-agent request limits at the Gateway.">
                <Toggle enabled={rateLimitEnabled} onChange={setRateLimitEnabled} />
              </Field>
              <Field label="Max requests / minute" description="Hard cap per agentId. 429 is returned when exceeded.">
                <TextInput value={maxRpm} onChange={setMaxRpm} placeholder="120" />
              </Field>
              <Field label="IP allowlist" description="Comma-separated CIDR ranges. Leave empty to allow all.">
                <TextInput value={ipWhitelist} onChange={setIpWhitelist} placeholder="10.0.0.0/8, 203.0.113.0/24" mono />
              </Field>
            </div>
          )}
        </div>
      </div>
    );
  }
  