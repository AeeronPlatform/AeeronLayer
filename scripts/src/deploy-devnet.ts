#!/usr/bin/env tsx
  /**
   * deploy-devnet.ts
   *
   * Automates the full Aeeron devnet deployment:
   *   1. Build the Anchor program (anchor build)
   *   2. Deploy aeeron-verifier to devnet
   *   3. Airdrop SOL to the gateway keypair if balance is low
   *   4. Write the deployed program ID back to Anchor.toml and declare_id!
   *   5. Emit a deployment manifest to dist/deploy-manifest.json
   *
   * Usage:
   *   pnpm --filter @workspace/scripts run deploy:devnet
   *   GATEWAY_KEYPAIR_JSON=<base64> pnpm --filter @workspace/scripts run deploy:devnet
   */

  import { execSync }       from 'child_process';
  import { writeFileSync, readFileSync, mkdirSync } from 'fs';
  import { join }           from 'path';
  import {
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
  } from '@solana/web3.js';

  const RPC_URL     = process.env.SOLANA_RPC_URL     ?? 'https://api.devnet.solana.com';
  const ANCHOR_DIR  = join(__dirname, '../../programs/aeeron-verifier');
  const MANIFEST_OUT = join(__dirname, '../../dist/deploy-manifest.json');

  const connection  = new Connection(RPC_URL, 'confirmed');

  function run(cmd: string, cwd?: string): string {
    console.log(`  $ ${cmd}`);
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'] }).trim();
  }

  async function ensureFunded(keypair: Keypair, minSol = 1): Promise<void> {
    const balance = await connection.getBalance(keypair.publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    console.log(`  Gateway wallet: ${keypair.publicKey.toBase58()}  balance: ${solBalance.toFixed(4)} SOL`);
    if (solBalance < minSol) {
      console.log(`  Balance low — requesting airdrop...`);
      const sig = await connection.requestAirdrop(keypair.publicKey, 2 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, 'confirmed');
      console.log(`  Airdrop confirmed: ${sig}`);
    }
  }

  function loadGatewayKeypair(): Keypair {
    const raw = process.env.GATEWAY_KEYPAIR_JSON;
    if (!raw) {
      console.log('  GATEWAY_KEYPAIR_JSON not set — generating ephemeral keypair for dry run');
      return Keypair.generate();
    }
    return Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(Buffer.from(raw, 'base64').toString('utf8'))),
    );
  }

  function patchProgramId(programId: string): void {
    const tomlPath = join(ANCHOR_DIR, 'Anchor.toml');
    let toml = readFileSync(tomlPath, 'utf8');
    toml = toml.replace(
      /aeeron_verifier = ".*?"/g,
      `aeeron_verifier = "${programId}"`,
    );
    writeFileSync(tomlPath, toml);

    const libPath = join(ANCHOR_DIR, 'src/lib.rs');
    let lib = readFileSync(libPath, 'utf8');
    lib = lib.replace(
      /declare_id!\(".*?"\)/,
      `declare_id!("${programId}")`,
    );
    writeFileSync(libPath, lib);

    console.log(`  Patched program ID → ${programId}`);
  }

  async function main(): Promise<void> {
    console.log('\n═══ Aeeron devnet deployment ════════════════════════════════\n');

    const gateway = loadGatewayKeypair();
    await ensureFunded(gateway);

    console.log('\n[1/3] Building Anchor program...');
    run('anchor build', ANCHOR_DIR);

    console.log('\n[2/3] Deploying aeeron-verifier to devnet...');
    const deployOut = run(
      `anchor deploy --provider.cluster devnet --provider.wallet ~/.config/solana/id.json`,
      ANCHOR_DIR,
    );

    const match = deployOut.match(/Program Id:\s*([A-Za-z0-9]{32,44})/);
    const programId = match?.[1] ?? 'UNKNOWN';
    console.log(`  Program ID: ${programId}`);

    console.log('\n[3/3] Writing deployment manifest...');
    patchProgramId(programId);

    mkdirSync(join(__dirname, '../../dist'), { recursive: true });
    const manifest = {
      programId,
      cluster:      'devnet',
      rpcUrl:       RPC_URL,
      deployedAt:   new Date().toISOString(),
      gatewayWallet: gateway.publicKey.toBase58(),
      anchorVersion: run('anchor --version').replace('anchor-cli ', ''),
      solanaVersion: run('solana --version').replace('solana-cli ', '').split(' ')[0],
    };
    writeFileSync(MANIFEST_OUT, JSON.stringify(manifest, null, 2));
    console.log(`\n✓  Manifest written to ${MANIFEST_OUT}`);
    console.log(JSON.stringify(manifest, null, 2));
    console.log('\n═══════════════════════════════════════════════════════════════\n');
  }

  main().catch((err) => { console.error(err); process.exit(1); });
  