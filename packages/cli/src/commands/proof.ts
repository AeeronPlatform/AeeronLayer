import { Command } from 'commander';
  import { ProofVerifier } from '@aeeron/protocol';

  export const proofCommand = new Command('proof')
    .description('Verify on-chain payment proofs');

  proofCommand
    .command('verify <intentId>')
    .description('Read PaymentRecord PDA and print settlement details')
    .option('--rpc <url>', 'Solana RPC URL', process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com')
    .option('--json', 'Output raw JSON')
    .action(async (intentId: string, opts: { rpc: string; json?: boolean }) => {
      const verifier = new ProofVerifier(opts.rpc);

      console.log(`Looking up on-chain proof for ${intentId}...`);
      const result = await verifier.verify(intentId);

      if (!result.ok) {
        console.error(`\n✗  ${result.error}  [${result.code}]`);
        process.exit(1);
      }

      const { record } = result;

      if (opts.json) { console.log(JSON.stringify({ ...record, amountLamports: record.amountLamports.toString() }, null, 2)); return; }

      console.log(`
  ✓  Payment settled on-chain
     Intent ID   : ${record.intentId}
     Payer       : ${record.payer}
     Recipient   : ${record.recipient}
     Amount      : ${(Number(record.amountLamports) / 1e9).toFixed(6)} SOL  (${record.amountLamports} lamports)
     Rail        : ${record.rail}
     Settled at  : ${new Date(record.settledAt).toISOString()}
     Agent hash  : ${record.agentIdHash}
     Cap hash    : ${record.capabilityHash}
  `);
    });
  