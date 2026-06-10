import { Command } from 'commander';

  export const agentCommand = new Command('agent')
    .description('Manage agents registered on the Aeeron Gateway');

  agentCommand
    .command('list')
    .description('List all registered agents')
    .option('--gateway <url>', 'Gateway base URL', process.env.AEERON_GATEWAY_URL ?? 'https://api.aeeron.xyz')
    .option('--status <status>', 'Filter by status: online | idle | offline')
    .option('--json', 'Output raw JSON')
    .action(async (opts: { gateway: string; status?: string; json?: boolean }) => {
      const url = new URL('/api/agents', opts.gateway);
      if (opts.status) url.searchParams.set('status', opts.status);

      let agents: Record<string, unknown>[];
      try {
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        agents = (await res.json() as { agents: Record<string, unknown>[] }).agents;
      } catch (err) {
        console.error('Error:', String(err));
        process.exit(1);
      }

      if (opts.json) { console.log(JSON.stringify(agents, null, 2)); return; }

      const STATUS_ICON: Record<string, string> = { online: '🟢', idle: '🟡', offline: '⚫' };
      console.log(`\nFound ${agents.length} agent(s)\n`);
      for (const a of agents) {
        const icon = STATUS_ICON[String(a['status'])] ?? '❓';
        console.log(`  ${icon}  ${a['agentId']}  v${a['version']}  [${a['status']}]`);
        console.log(`       capabilities: ${(a['capabilities'] as string[]).join(', ')}`);
        console.log(`       endpoint:     ${a['endpoint']}`);
        console.log();
      }
    });

  agentCommand
    .command('info <agentId>')
    .description('Show detailed info for a single agent')
    .option('--gateway <url>', 'Gateway base URL', process.env.AEERON_GATEWAY_URL ?? 'https://api.aeeron.xyz')
    .option('--json', 'Output raw JSON')
    .action(async (agentId: string, opts: { gateway: string; json?: boolean }) => {
      try {
        const res = await fetch(`${opts.gateway}/api/agents/${agentId}`);
        if (res.status === 404) { console.error(`Agent "${agentId}" not found`); process.exit(1); }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const agent = await res.json();
        if (opts.json) { console.log(JSON.stringify(agent, null, 2)); return; }
        console.log(JSON.stringify(agent, null, 2));
      } catch (err) {
        console.error('Error:', String(err));
        process.exit(1);
      }
    });
  