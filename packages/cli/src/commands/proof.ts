import { Command } from 'commander';
  import { readFileSync } from 'fs';

  const BASE_URL = process.env.AEERON_GATEWAY_URL ?? 'https://gateway.aeeron.xyz';

  export const proofCommand = new Command('proof')
    .description('Inspect and verify x402 payment proofs');

  proofCommand
    .command('verify <proofFile>')
    .description('Verify a payment proof JSON file against the gateway')
    .action(async (proofFile: string) => {
      let proof: unknown;
      try { proof = JSON.parse(readFileSync(proofFile, 'utf8')); }
      catch { console.error('Cannot read proof file:', proofFile); process.exit(1); }

      const res  = await fetch(`${BASE_URL}/v1/proof/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proof),
      });
      const data = await res.json();
      if (data.ok) {
        console.log(`  ✓ Proof valid  tx: ${data.proof.txSignature.slice(0, 16)}…`);
      } else {
        console.error(`  ✗ Invalid proof: ${data.error}`);
        process.exit(1);
      }
    });
  