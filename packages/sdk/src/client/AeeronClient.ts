import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";

import type {
  AeeronClientConfig,
  FetchWithPaymentOptions,
  PaymentDetailsData,
  PaymentProofData,
  SettlementResult,
} from "../types";

import {
  X402_HEADER_PAYMENT_DETAILS,
  X402_HEADER_PAYMENT_PROOF,
  X402_HEADER_NETWORK,
  X402_HEADER_VERSION,
  X402_PROTOCOL_VERSION,
  AEERON_PROGRAM_ID,
  DEFAULT_PROOF_TTL_SECONDS,
} from "../constants";

import { X402Codec } from "../protocol/X402Codec";
import { PaymentProof } from "../protocol/PaymentProof";
import { ChannelManager } from "./ChannelManager";
import { buildDirectPayTransaction } from "../protocol/transactions";

/**
 * AeeronClient — the primary entry point for agents that need to pay for resources.
 *
 * Usage:
 * ```ts
 * const client = new AeeronClient({ connection, payer });
 * const response = await client.fetchWithPayment("https://api.example.com/data");
 * ```
 */
export class AeeronClient {
  readonly connection: Connection;
  readonly payer: Keypair;
  readonly programId: PublicKey;
  readonly defaultToken: string;
  readonly proofTtlSeconds: number;

  private channelManager: ChannelManager;

  constructor(config: AeeronClientConfig) {
    this.connection = config.connection;
    this.payer = config.payer;
    this.programId = config.programId ?? AEERON_PROGRAM_ID;
    this.defaultToken = config.defaultToken ?? "SOL";
    this.proofTtlSeconds = config.proofTtlSeconds ?? DEFAULT_PROOF_TTL_SECONDS;

    this.channelManager = new ChannelManager({
      connection: this.connection,
      payer: this.payer,
      programId: this.programId,
    });
  }

  /**
   * Fetch a resource, automatically handling 402 Payment Required responses.
   * On 402, extracts payment details, submits the Solana transaction, and retries.
   */
  async fetchWithPayment(
    url: string,
    options: FetchWithPaymentOptions = {}
  ): Promise<Response> {
    const { maxAmount, token, onBeforePayment, onPaymentSettled, ...fetchInit } = options;

    // First attempt — expect either a 200 or 402
    const firstResponse = await fetch(url, fetchInit);

    if (firstResponse.status !== 402) {
      return firstResponse;
    }

    // Parse payment details from the 402 response
    const detailsHeader = firstResponse.headers.get(X402_HEADER_PAYMENT_DETAILS);
    if (!detailsHeader) {
      throw new AeeronPaymentError(
        "Server returned 402 without X-Payment-Details header",
        "MISSING_PAYMENT_DETAILS"
      );
    }

    const details = X402Codec.decodePaymentDetails(detailsHeader);
    this.validatePaymentDetails(details, maxAmount);

    if (onBeforePayment) {
      await onBeforePayment(details);
    }

    // Submit the on-chain payment
    const settlement = await this.settle(details, token);

    if (onPaymentSettled) {
      await onPaymentSettled(settlement.proof);
    }

    // Retry the original request with the payment proof attached
    const proofHeader = X402Codec.encodePaymentProof(settlement.proof);
    const retryHeaders = new Headers(fetchInit.headers);
    retryHeaders.set(X402_HEADER_PAYMENT_PROOF, proofHeader);
    retryHeaders.set(X402_HEADER_VERSION, String(X402_PROTOCOL_VERSION));

    return fetch(url, { ...fetchInit, headers: retryHeaders });
  }

  /**
   * Settle a payment for given PaymentDetails, returning a proof.
   */
  async settle(
    details: PaymentDetailsData,
    tokenOverride?: string
  ): Promise<SettlementResult> {
    const token = tokenOverride ?? details.token ?? this.defaultToken;
    const payee = new PublicKey(details.payee);

    // Build and send the Solana transaction
    const { transaction, nonce } = await buildDirectPayTransaction({
      connection: this.connection,
      payer: this.payer.publicKey,
      payee,
      amount: details.amount,
      nonce: Buffer.from(details.nonce, "hex"),
      proofExpiry: details.expiry,
      programId: this.programId,
    });

    // Sign the payment proof message
    const proofMessage = PaymentProof.buildMessage({
      payer: this.payer.publicKey.toBase58(),
      payee: details.payee,
      amount: details.amount,
      nonce: details.nonce,
      expiry: details.expiry,
    });

    const signature = nacl.sign.detached(proofMessage, this.payer.secretKey);

    // Submit the transaction
    transaction.sign(this.payer);
    const txHash = await this.connection.sendRawTransaction(
      transaction.serialize(),
      { skipPreflight: false, preflightCommitment: "confirmed" }
    );

    await this.connection.confirmTransaction(txHash, "confirmed");

    const proof: PaymentProofData = {
      signature: bs58.encode(signature),
      txHash,
      nonce: details.nonce,
      timestamp: Math.floor(Date.now() / 1000),
    };

    return {
      txHash,
      proof,
      amount: details.amount,
      token,
      settledAt: proof.timestamp,
    };
  }

  /**
   * Open a payment channel with a payee for repeated micro-payments.
   */
  async openChannel(payee: PublicKey, initialAmount: number, expiry = 0) {
    return this.channelManager.openChannel(payee, initialAmount, expiry);
  }

  /**
   * Close an existing channel and recover remaining collateral.
   */
  async closeChannel(payee: PublicKey) {
    return this.channelManager.closeChannel(payee);
  }

  /**
   * Get the current state of a payment channel.
   */
  async getChannel(payee: PublicKey) {
    return this.channelManager.getChannel(payee);
  }

  private validatePaymentDetails(
    details: PaymentDetailsData,
    maxAmount?: number
  ) {
    const now = Math.floor(Date.now() / 1000);

    if (details.expiry < now) {
      throw new AeeronPaymentError(
        `Payment details expired at ${details.expiry}`,
        "DETAILS_EXPIRED"
      );
    }

    if (maxAmount !== undefined && details.amount > maxAmount) {
      throw new AeeronPaymentError(
        `Server requested ${details.amount} lamports, max allowed is ${maxAmount}`,
        "AMOUNT_EXCEEDS_MAX"
      );
    }

    if (!details.payee) {
      throw new AeeronPaymentError("Missing payee in payment details", "MISSING_PAYEE");
    }
  }
}

export class AeeronPaymentError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "AeeronPaymentError";
  }
}
