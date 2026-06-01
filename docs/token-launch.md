# Token Launch Runbook

  Operational checklist for the Aeeron TGE (Token Generation Event).  
  Owner: core team. Target: Q3 2026.

  ---

  ## Pre-launch (T-30 days)

  ### Smart contracts
  - [ ] Deploy `aeeron_protocol` to mainnet-beta, verify program ID matches IDL
  - [ ] Deploy SPL Token-2022 mint with 9 decimals, freeze authority revoked post-mint
  - [ ] Deploy vesting program, seed all team/ecosystem/reserve vesting accounts
  - [ ] Run third-party audit (Ottersec / OShield), publish report at `docs/audit/`
  - [ ] Verify protocol treasury multisig (3-of-5 Squads) controls protocol bucket

  ### Liquidity
  - [ ] Seed Raydium CLMM pool: AERN/SOL (initial tick range ±20%)
  - [ ] Seed Raydium CLMM pool: AERN/USDC
  - [ ] Submit token metadata to Jupiter allowlist; verify routing works on devnet fork
  - [ ] Set up Orca Whirlpool position as secondary liquidity layer
  - [ ] Confirm SwapWidget on dashboard resolves correct mint post-TGE

  ### Infrastructure
  - [ ] Rotate all devnet RPC endpoints to mainnet (Helius primary, Triton fallback)
  - [ ] Update `AERN_MINT` constant in `packages/protocol/src/constants.ts`
  - [ ] Update `SwapWidget.tsx` placeholder mint to real mint address
  - [ ] Enable mainnet in Gateway API (`SOLANA_NETWORK=mainnet-beta`)
  - [ ] Smoke-test full payment flow: open channel → settle → close on mainnet

  ### Communications
  - [ ] Publish tokenomics article (mirror: Paragraph / Mirror)
  - [ ] Update docs site with token address and explorer links
  - [ ] Announce on-chain program address via signed message from team wallet

  ---

  ## Launch day (T-0)

  | Time    | Action                                         | Owner     |
  |---------|------------------------------------------------|-----------|
  | T-2h    | Final on-chain state check (all PDAs funded)   | eng       |
  | T-1h    | Open Raydium pools, verify price feed          | eng       |
  | T-30min | Enable swap widget on dashboard (remove banner)| frontend  |
  | T-0     | Publish mint address publicly                  | comms     |
  | T+1h    | Monitor volume, liquidity depth, bot activity  | eng/comms |
  | T+4h    | Retroactive airdrop snapshot (if applicable)   | eng       |

  ---

  ## Post-launch (T+7 days)

  - [ ] Verify all vesting accounts correctly initialized on-chain
  - [ ] Confirm CoinGecko / CoinMarketCap listings submitted
  - [ ] Enable governance module (once circulating supply > 5%)
  - [ ] Publish first protocol revenue report (fee distribution to treasury)

  ---

  ## Rollback procedure

  If a critical vulnerability is discovered before T+24h:
  1. Contact Raydium / Orca support to pause pools
  2. Issue public incident notice within 1 hour
  3. Redeploy patched program to new address (old address cannot be upgraded without upgrade authority)
  4. Community vote on migration via Realms DAO proposal

  ---

  ## Contacts

  | Role        | Handle           |
  |-------------|------------------|
  | Lead Eng    | @aeeron-core     |
  | Security    | security@aeeron.xyz |
  | Multisig    | Squads: `AERNm...5sig` |
  