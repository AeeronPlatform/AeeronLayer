#!/usr/bin/env node
  import { Command } from 'commander';
  import { agentCommand }   from './commands/agent';
  import { feesCommand }    from './commands/fees';
  import { sessionCommand } from './commands/session';
  import { proofCommand }   from './commands/proof';

  const program = new Command();

  program
    .name('aeeron')
    .description('Aeeron CLI — manage agents, simulate fees, and inspect x402 sessions')
    .version('0.4.0');

  program.addCommand(agentCommand);
  program.addCommand(feesCommand);
  program.addCommand(sessionCommand);
  program.addCommand(proofCommand);

  program.parseAsync(process.argv).catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
  