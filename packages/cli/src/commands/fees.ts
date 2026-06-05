import { Command } from 'commander';
  import { simulateComparison, aeeronRawToDisplay } from '@aeeron/protocol';

  export const feesCommand = new Command('fees')
    .description('Simulate x402 payment fees')
    .argument('<price>', 'price per call in lamports')
    .argument('<calls>', 'number of calls')
    .option('--sol-price <usd>', 'SOL price in USD for cost estimates', '145')
    .option('--json', 'output raw JSON')
    .action((price: string, calls: string, opts) => {
      const priceLamports = BigInt(price);
      const callCount     = parseInt(calls, 10);
      const solPrice      = parseFloat(opts.solPrice);

      const result = simulateComparison(priceLamports, callCount);

      if (opts.json) {
        const safe = JSON.parse(JSON.stringify(result, (_k, v) =>
          typeof v === 'bigint' ? v.toString() : v,
        ));
        console.log(JSON.stringify(safe, null, 2));
        return;
      }

      const lamportsToSol = (l: bigint) => (Number(l) / 1e9).toFixed(7);
      const lamportsToUsd = (l: bigint) => '$' + ((Number(l) / 1e9) * solPrice).toFixed(4);

      console.log('');
      console.log(`  Price per call : ${price} lamports (${lamportsToSol(priceLamports)} SOL)`);
      console.log(`  Calls          : ${callCount}`);
      console.log(`  SOL price      : $${solPrice}`);
      console.log('');
      console.log('  ─────────────────────────────────────────────────────');
      console.log(`  Direct pay total   : ${lamportsToSol(result.direct.totalCostLamports)} SOL  (${lamportsToUsd(result.direct.totalCostLamports)})`);
      console.log(`  Channel total      : ${lamportsToSol(result.channel.totalCostLamports)} SOL  (${lamportsToUsd(result.channel.totalCostLamports)})`);
      console.log('');
      console.log(`  Recommendation     : ${result.recommendation.toUpperCase()}`);
      console.log(`  Break-even calls   : ${result.breakEvenCalls}`);
      if (result.channel.savingsVsDirectLamports > 0n) {
        console.log(`  Savings (channel)  : ${lamportsToSol(result.channel.savingsVsDirectLamports)} SOL`);
      }
      console.log('');
    });
  