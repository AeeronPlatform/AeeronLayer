import { PublicKey } from '@solana/web3.js';

  // ─── Supply constants ─────────────────────────────────────────────────────────

  export const AERN_DECIMALS = 9;
  export const AERN_TOTAL_SUPPLY = 1_000_000_000n * BigInt(10 ** AERN_DECIMALS);

  // ─── Distribution buckets ─────────────────────────────────────────────────────

  export const DISTRIBUTION = {
    protocol:    { bps: 3000, label: 'Protocol Treasury' },
    ecosystem:   { bps: 2500, label: 'Ecosystem & Grants' },
    community:   { bps: 2000, label: 'Community & Incentives' },
    team:        { bps: 1500, label: 'Team & Contributors' },
    reserves:    { bps: 1000, label: 'Strategic Reserves' },
  } as const;

  export type BucketKey = keyof typeof DISTRIBUTION;

  export function bucketAllocation(bucket: BucketKey): bigint {
    return (AERN_TOTAL_SUPPLY * BigInt(DISTRIBUTION[bucket].bps)) / 10_000n;
  }

  // ─── Vesting schedules ────────────────────────────────────────────────────────

  export interface VestingSchedule {
    cliffSeconds: number;
    durationSeconds: number;
    initialUnlockBps: number; // immediate unlock at TGE (basis points)
  }

  export const VESTING_SCHEDULES: Record<BucketKey, VestingSchedule> = {
    protocol:  { cliffSeconds: 0,              durationSeconds: 0,              initialUnlockBps: 10_000 },
    ecosystem: { cliffSeconds: 0,              durationSeconds: 365 * 86_400,   initialUnlockBps: 2_000  },
    community: { cliffSeconds: 0,              durationSeconds: 730 * 86_400,   initialUnlockBps: 1_000  },
    team:      { cliffSeconds: 365 * 86_400,   durationSeconds: 1095 * 86_400,  initialUnlockBps: 0      },
    reserves:  { cliffSeconds: 180 * 86_400,   durationSeconds: 730 * 86_400,   initialUnlockBps: 0      },
  };

  // ─── Vesting math ─────────────────────────────────────────────────────────────

  export function calculateVested(
    totalAmount: bigint,
    schedule: VestingSchedule,
    startTs: number,
    nowTs: number,
  ): bigint {
    const elapsed = nowTs - startTs;
    if (elapsed < 0) return 0n;

    const initialUnlock = (totalAmount * BigInt(schedule.initialUnlockBps)) / 10_000n;
    const vestingAmount  = totalAmount - initialUnlock;

    if (schedule.durationSeconds === 0) return totalAmount;
    if (elapsed < schedule.cliffSeconds) return initialUnlock;

    const vestedElapsed = Math.min(elapsed - schedule.cliffSeconds, schedule.durationSeconds);
    const linear = (vestingAmount * BigInt(vestedElapsed)) / BigInt(schedule.durationSeconds);
    return initialUnlock + linear;
  }

  export function claimableNow(
    totalAmount: bigint,
    alreadyClaimed: bigint,
    schedule: VestingSchedule,
    startTs: number,
    nowTs: number,
  ): bigint {
    const vested = calculateVested(totalAmount, schedule, startTs, nowTs);
    return vested > alreadyClaimed ? vested - alreadyClaimed : 0n;
  }

  export function scheduleOf(bucket: BucketKey): VestingSchedule {
    return VESTING_SCHEDULES[bucket];
  }

  // ─── On-chain vesting account layout (mirrors Solana program state) ───────────

  export interface VestingAccount {
    beneficiary: PublicKey;
    bucket: BucketKey;
    totalAmount: bigint;
    claimed: bigint;
    startTs: number;
    bump: number;
  }

  export function vestingPda(beneficiary: PublicKey, programId: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('vesting'), beneficiary.toBytes()],
      programId,
    );
  }
  