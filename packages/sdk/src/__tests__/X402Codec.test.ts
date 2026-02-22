import { describe, it, expect } from "vitest";
import { X402Codec } from "../protocol/X402Codec";
import type { PaymentDetailsData } from "../types";

const SAMPLE_DETAILS: PaymentDetailsData = {
  payee: "4aRwYnPzXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  amount: 1_000_000,
  token: "SOL",
  nonce: "a".repeat(64),
  expiry: Math.floor(Date.now() / 1000) + 300,
  network: "mainnet-beta",
  version: 1,
};

describe("X402Codec", () => {
  describe("encodePaymentDetails / decodePaymentDetails", () => {
    it("round-trips payment details", () => {
      const encoded = X402Codec.encodePaymentDetails(SAMPLE_DETAILS);
      const decoded = X402Codec.decodePaymentDetails(encoded);
      expect(decoded).toEqual(SAMPLE_DETAILS);
    });

    it("produces a valid base64 string", () => {
      const encoded = X402Codec.encodePaymentDetails(SAMPLE_DETAILS);
      expect(() => Buffer.from(encoded, "base64")).not.toThrow();
    });

    it("throws on invalid base64", () => {
      expect(() => X402Codec.decodePaymentDetails("!!!not-base64!!!")).toThrow();
    });
  });

  describe("encodePaymentProof / decodePaymentProof", () => {
    const proof = {
      signature: "sig",
      txHash: "txhash",
      nonce: "a".repeat(64),
      timestamp: 1700000000,
    };

    it("round-trips payment proof", () => {
      const encoded = X402Codec.encodePaymentProof(proof);
      const decoded = X402Codec.decodePaymentProof(encoded);
      expect(decoded).toEqual(proof);
    });
  });

  describe("buildPaymentDetails", () => {
    it("generates a nonce of 64 hex characters", () => {
      const details = X402Codec.buildPaymentDetails({
        payee: SAMPLE_DETAILS.payee,
        amount: 500_000,
      });
      expect(details.nonce).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(details.nonce)).toBe(true);
    });

    it("sets version to 1", () => {
      const details = X402Codec.buildPaymentDetails({
        payee: SAMPLE_DETAILS.payee,
        amount: 500_000,
      });
      expect(details.version).toBe(1);
    });

    it("expiry is in the future", () => {
      const details = X402Codec.buildPaymentDetails({
        payee: SAMPLE_DETAILS.payee,
        amount: 500_000,
        ttlSeconds: 120,
      });
      expect(details.expiry).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it("generates unique nonces on each call", () => {
      const d1 = X402Codec.buildPaymentDetails({ payee: SAMPLE_DETAILS.payee, amount: 1 });
      const d2 = X402Codec.buildPaymentDetails({ payee: SAMPLE_DETAILS.payee, amount: 1 });
      expect(d1.nonce).not.toBe(d2.nonce);
    });
  });
});
