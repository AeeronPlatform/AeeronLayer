#!/usr/bin/env node
  import { Command } from 'commander';
  import { agentCommand }  from './commands/agent';
  import { intentCommand } from './commands/intent';
  import { proofCommand }  from './commands/proof';

  const program = new Command();

  program
    .name('aeeron')
    .description('Aeeron CLI — manage agents, intents, and proofs on the Sovereign Layer')
    .version('0.3.0');

  program.addCommand(agentCommand);
  program.addCommand(intentCommand);
  program.addCommand(proofCommand);

  program.parseAsync(process.argv).catch((err) => {
    console.error(err);
    process.exit(1);
  });
  