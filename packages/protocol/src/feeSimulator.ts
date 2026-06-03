import { AEERON_DECIMALS } from './constants';

  /**
   * x402 fee model (approximations — exact values depend on network conditions).
   */
  const FEE_MODEL = {
    /** Base Solana transaction fee per signature (lamports). */
    baseTxFee: 5_000n,
    /** Aeeron protocol fee: 0.5% of payment amount. */
    protocolFeeBps: 50n,
    /** Channel open cost: one on-chain tx. */
    channelOpenLamports: 5_000n,
    /** Channel close cost: one on-chain tx. */
    channelCloseLamports: 5_000n,
    /** Per-call overhead in a channel (off-chain signature, negligible on-chain). */
    channelPerCallLamports: 0n,
  } as const;

  export interface SimulateDirectPayResult {
    mode: 'direct';
    calls: number;
    pricePerCallLamports: bigint;
    totalPaymentLamports: bigint;
    totalProtocolFeeLamports: bigint;
    totalTxFeeLamports: bigint;
    totalCostLamports: bigint;
    totalCostSol: string;
    costPerCallLamports: bigint;
  }

  export interface SimulateChannelResult {
    mode: 'channel';
    calls: number;
    pricePerCallLamports: bigint;
    channelDepositLamports: bigint;
    openCloseFee: bigint;
    totalProtocolFeeLamports: bigint;
    totalCostLamports: bigint;
    totalCostSol: string;
    costPerCallLamports: bigint;
    savingsVsDirectLamports: bigint;
    breakEvenCalls: number;
  }

  export interface SimulateComparisonResult {
    direct: SimulateDirectPayResult;
    channel: SimulateChannelResult;
    recommendation: 'direct' | 'channel';
    breakEvenCalls: number;
  }

  function bps(amount: bigint, basisPoints: bigint): bigint {
    return (amount * basisPoints) / 10_000n;
  }

  function lamportsToSol(l: bigint): string {
    const factor = BigInt(10 ** 9);
    const whole  = l / factor;
    const frac   = l % factor;
    return `${whole}.${frac.toString().padStart(9, '0')}`;
  }

  /**
   * simulateDirectPay
   *
   * Estimates total cost for N direct x402 payments to an agent.
   * Each call = 1 on-chain tx + protocol fee.
   */
  export function simulateDirectPay(
    pricePerCallLamports: bigint,
    calls: number,
  ): SimulateDirectPayResult {
    const n = BigInt(calls);
    const totalPayment      = pricePerCallLamports * n;
    const totalProtocolFee  = bps(totalPayment, FEE_MODEL.protocolFeeBps);
    const totalTxFee        = FEE_MODEL.baseTxFee * n;
    const totalCost         = totalPayment + totalProtocolFee + totalTxFee;

    return {
      mode: 'direct',
      calls,
      pricePerCallLamports,
      totalPaymentLamports:     totalPayment,
      totalProtocolFeeLamports: totalProtocolFee,
      totalTxFeeLamports:       totalTxFee,
      totalCostLamports:        totalCost,
      totalCostSol:             lamportsToSol(totalCost),
      costPerCallLamports:      calls > 0 ? totalCost / n : 0n,
    };
  }

  /**
   * simulateChannel
   *
   * Estimates total cost for N calls through a payment channel.
   * Open + close = 2 txs; per-call settlement is off-chain.
   */
  export function simulateChannel(
    pricePerCallLamports: bigint,
    calls: number,
  ): SimulateChannelResult {
    const n = BigInt(calls);
    const totalPayment      = pricePerCallLamports * n;
    const totalProtocolFee  = bps(totalPayment, FEE_MODEL.protocolFeeBps);
    const openCloseFee      = FEE_MODEL.channelOpenLamports + FEE_MODEL.channelCloseLamports;
    const totalCost         = totalPayment + totalProtocolFee + openCloseFee;

    const direct            = simulateDirectPay(pricePerCallLamports, calls);
    const savings           = direct.totalCostLamports > totalCost
      ? direct.totalCostLamports - totalCost
      : 0n;

    // break-even: channel fixed overhead / per-call tx savings
    const perCallTxSaving = FEE_MODEL.baseTxFee;
    const breakEvenCalls  = perCallTxSaving > 0n
      ? Number(openCloseFee / perCallTxSaving) + 1
      : 0;

    return {
      mode: 'channel',
      calls,
      pricePerCallLamports,
      channelDepositLamports:   totalPayment,
      openCloseFee,
      totalProtocolFeeLamports: totalProtocolFee,
      totalCostLamports:        totalCost,
      totalCostSol:             lamportsToSol(totalCost),
      costPerCallLamports:      calls > 0 ? totalCost / n : 0n,
      savingsVsDirectLamports:  savings,
      breakEvenCalls,
    };
  }

  /**
   * simulateComparison
   *
   * Returns both modes side-by-side and a recommendation.
   */
  export function simulateComparison(
    pricePerCallLamports: bigint,
    calls: number,
  ): SimulateComparisonResult {
    const direct  = simulateDirectPay(pricePerCallLamports, calls);
    const channel = simulateChannel(pricePerCallLamports, calls);
    return {
      direct,
      channel,
      recommendation: channel.totalCostLamports <= direct.totalCostLamports ? 'channel' : 'direct',
      breakEvenCalls: channel.breakEvenCalls,
    };
  }
  