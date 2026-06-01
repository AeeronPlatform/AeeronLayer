# AERN Tokenomics

  > Version 1.0 — June 2026

  ---

  ## Overview

  AERN is the native utility and governance token of the Aeeron protocol.  
  It is used to pay protocol fees, participate in governance, and incentivize  
  network participants (resource servers, liquidity providers, early adopters).

  **Total supply:** 1,000,000,000 AERN (fixed, no inflation)  
  **Standard:** SPL Token-2022  
  **Decimals:** 9  
  **Chain:** Solana mainnet-beta

  ---

  ## Distribution

  | Bucket                  | Allocation | Amount (AERN)   | Vesting                                      |
  |-------------------------|------------|-----------------|----------------------------------------------|
  | Protocol Treasury       | 30%        | 300,000,000     | Immediate; governed by multisig DAO          |
  | Ecosystem & Grants      | 25%        | 250,000,000     | 20% at TGE, linear over 12 months            |
  | Community & Incentives  | 20%        | 200,000,000     | 10% at TGE, linear over 24 months            |
  | Team & Contributors     | 15%        | 150,000,000     | 12-month cliff, linear over 36 months        |
  | Strategic Reserves      | 10%        | 100,000,000     | 6-month cliff, linear over 24 months         |

  ---

  ## Vesting schedule (visual)

  ```
  Month     0    6    12   18   24   30   36   42   48
            │    │    │    │    │    │    │    │    │
  Treasury  ████████████████████████████████████████  (unlocked at TGE)
  Ecosystem ██░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░
  Community █░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░
  Team      ░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
  Reserves  ░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░

  █ = TGE unlock  ▓ = linear vesting  ░ = cliff / locked
  ```

  ---

  ## Protocol fees

  Aeeron charges a 0.1% fee on all settled payments (configurable via governance).  
  Fees accrue to the protocol treasury PDA and are distributed as follows:

  - **70%** buyback and burn of AERN (deflationary pressure)
  - **20%** distributed pro-rata to staked AERN holders
  - **10%** ecosystem grants fund

  ---

  ## Governance

  AERN holders vote on:
  - Protocol fee changes
  - Treasury spend proposals
  - Program upgrade approvals
  - New asset/token support

  Voting power: 1 AERN = 1 vote. Quorum: 4% of circulating supply.  
  Platform: Realms (SPL Governance). Proposal threshold: 100,000 AERN.

  ---

  ## Token utility

  | Use case                    | Description                                                    |
  |-----------------------------|----------------------------------------------------------------|
  | Payment fee denomination    | Protocol fees collected and burned in AERN                    |
  | Staking                     | Stake AERN to earn a share of protocol fees                   |
  | Governance                  | Vote on protocol upgrades and treasury allocation             |
  | Channel collateral          | Optionally denominate payment channels in AERN (in addition to SOL/USDC) |
  | Developer grants            | Ecosystem bucket funds open-source tooling and integrations   |

  ---

  ## Security

  - Mint authority revoked after initial supply mint (no further issuance possible)
  - Freeze authority revoked (no account freezing)
  - Team tokens locked in on-chain vesting contracts, not transferable during cliff
  - Protocol treasury controlled by 3-of-5 Squads multisig
  