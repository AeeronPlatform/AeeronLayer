import { Command } from 'commander';
  import { IntentBuilder } from '@aeeron/protocol';
  import { randomUUID }    from 'crypto';

  export const intentCommand = new Command('intent')
    .description('Build and inspect x402 payment intents');

  intentCommand
    .command('build')
    .description('Construct and print a signed intent (dry-run, does not submit)')
    .requiredOption('--payer <pubkey>',     'Payer wallet public key')
    .requiredOption('--recipient <pubkey>', 'Recipient wallet public key')
    .requiredOption('--agent <id>',         'Agent ID')
    .requiredOption('--capability <name>',  'Capability to invoke')
    .requiredOption('--amount <lamports>',  'Max amount in lamports')
    .option('--rail <rail>',               'Payment rail: sol | spl', 'sol')
    .option('--ttl <ms>',                  'Intent TTL in milliseconds', '60000')
    .option('--session-token <token>',     'HMAC session token', process.env.SESSION_TOKEN ?? '')
    .action((opts: {
      payer: string; recipient: string; agent: string; capability: string;
      amount: string; rail: string; ttl: string; sessionToken: string;
    }) => {
      if (!opts.sessionToken) {
        console.error('Error: --session-token or SESSION_TOKEN env var required');
        process.exit(1);
      }
      const intent = new IntentBuilder()
        .payer(opts.payer)
        .recipient(opts.recipient)
        .agent(opts.agent)
        .capability(opts.capability)
        .maxAmount(BigInt(opts.amount))
        .rail(opts.rail as 'sol' | 'spl')
        .ttl(Number(opts.ttl))
        .build(opts.sessionToken);

      console.log('\nSigned intent (dry-run)\n');
      console.log(JSON.stringify({ ...intent, maxAmountLamports: intent.maxAmountLamports.toString() }, null, 2));
    });

  intentCommand
    .command('status <intentId>')
    .description('Poll the Gateway for settlement status of an intent')
    .option('--gateway <url>', 'Gateway base URL', process.env.AEERON_GATEWAY_URL ?? 'https://api.aeeron.xyz')
    .option('--watch', 'Poll every 2s until settled')
    .action(async (intentId: string, opts: { gateway: string; watch?: boolean }) => {
      const check = async () => {
        const res  = await fetch(`${opts.gateway}/api/gateway/status/${intentId}`);
        return res.json() as Promise<{ settled: boolean; txSignature?: string; slot?: number; settledAt?: number }>;
      };

      if (!opts.watch) {
        const s = await check();
        console.log(s.settled
          ? `\n✓  Settled — tx: ${s.txSignature}  slot: ${s.slot}`
          : `\n⏳  Not yet settled`);
        return;
      }

      console.log('Watching for settlement (Ctrl+C to stop)...');
      const timer = setInterval(async () => {
        const s = await check();
        if (s.settled) {
          console.log(`\n✓  Settled at ${new Date(s.settledAt!).toISOString()} — tx: ${s.txSignature}  slot: ${s.slot}`);
          clearInterval(timer);
          process.exit(0);
        }
        process.stdout.write('.');
      }, 2_000);
    });
  