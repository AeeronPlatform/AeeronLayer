import { Command } from 'commander';
  import { readFileSync } from 'fs';

  const BASE_URL = process.env.AEERON_GATEWAY_URL ?? 'https://gateway.aeeron.xyz';

  export const agentCommand = new Command('agent')
    .description('Manage registered agents');

  agentCommand
    .command('list')
    .description('List agents registered on the network')
    .option('--online', 'show only online agents')
    .option('--framework <name>', 'filter by framework')
    .option('--json', 'output raw JSON')
    .action(async (opts) => {
      const params = new URLSearchParams();
      if (opts.online)    params.set('online', 'true');
      if (opts.framework) params.set('framework', opts.framework);

      const res  = await fetch(`${BASE_URL}/v1/agents?${params}`);
      const data = await res.json();

      if (opts.json) { console.log(JSON.stringify(data, null, 2)); return; }

      if (!data.agents?.length) { console.log('  No agents found.'); return; }
      console.log('');
      for (const a of data.agents) {
        const status = a.online ? '\x1b[32m●\x1b[0m' : '\x1b[90m●\x1b[0m';
        console.log(`  ${status}  ${a.name.padEnd(24)} v${a.version}  ${a.agentId}`);
      }
      console.log(`\n  ${data.total} agent(s)\n`);
    });

  agentCommand
    .command('register <manifest>')
    .description('Register an agent from a JSON manifest file')
    .action(async (manifestPath: string) => {
      let manifest: unknown;
      try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); }
      catch { console.error('Failed to read manifest:', manifestPath); process.exit(1); }

      const res  = await fetch(`${BASE_URL}/v1/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manifest),
      });
      const data = await res.json();
      if (!res.ok) { console.error('Registration failed:', data.error); process.exit(1); }
      console.log(`\n  ✓ Registered: ${data.agentId}  (at ${data.registeredAt})\n`);
    });

  agentCommand
    .command('ping <agentId>')
    .description('Send a heartbeat to keep an agent online')
    .action(async (agentId: string) => {
      const res  = await fetch(`${BASE_URL}/v1/agents/${agentId}/heartbeat`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { console.error('Ping failed:', data.error); process.exit(1); }
      console.log(`  ✓ Heartbeat sent  ${data.lastHeartbeat}`);
    });
  