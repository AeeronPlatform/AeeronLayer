import { Command } from 'commander';

  const BASE_URL = process.env.AEERON_GATEWAY_URL ?? 'https://gateway.aeeron.xyz';

  export const sessionCommand = new Command('session')
    .description('Inspect and manage payment sessions');

  sessionCommand
    .command('list')
    .option('--agent <id>',  'filter by agent ID')
    .option('--status <s>',  'filter by status (active|expired|closed)')
    .option('--json', 'output raw JSON')
    .action(async (opts) => {
      const params = new URLSearchParams();
      if (opts.agent)  params.set('agentId', opts.agent);
      if (opts.status) params.set('status',  opts.status);

      const res  = await fetch(`${BASE_URL}/v1/sessions?${params}`);
      const data = await res.json();
      if (opts.json) { console.log(JSON.stringify(data, null, 2)); return; }

      if (!data.sessions?.length) { console.log('  No sessions.'); return; }
      console.log('');
      for (const s of data.sessions) {
        const icon = s.status === 'active' ? '\x1b[32m▸\x1b[0m' : '\x1b[90m▪\x1b[0m';
        const sol  = (Number(s.totalSpentLamports) / 1e9).toFixed(6);
        console.log(`  ${icon}  ${s.sessionId.slice(0,8)}  ${s.agentId.padEnd(28)}  ${s.totalCalls} calls  ${sol} SOL  [${s.status}]`);
      }
      console.log(`\n  Total spent: ${(Number(data.totalSpentLamports) / 1e9).toFixed(6)} SOL\n`);
    });

  sessionCommand
    .command('close <sessionId>')
    .action(async (sessionId: string) => {
      const res  = await fetch(`${BASE_URL}/v1/sessions/${sessionId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { console.error('Error:', data.error); process.exit(1); }
      const sol = (Number(data.summary.totalSpentLamports) / 1e9).toFixed(6);
      console.log(`  ✓ Session closed  ${sol} SOL  ${data.summary.totalCalls} calls  ${data.summary.duration}`);
    });
  