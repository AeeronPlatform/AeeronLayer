import { describe, it, expect } from "vitest";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { PaymentProof } from "../protocol/PaymentProof";

describe("PaymentProof", () => {
  const keypair = nacl.sign.keyPair();
  const payerPublicKey = bs58.encode(keypair.publicKey);

  const sampleInput = {
    payer: payerPublicKey,
    payee: "4aRwYnPz8nPzXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    amount: 1_000_000,
    nonce: "a".repeat(64),
    expiry: Math.floor(Date.now() / 1000) + 300,
  };

  describe("buildMessage", () => {
    it("produces a deterministic byte sequence", () => {
      const msg1 = PaymentProof.buildMessage(sampleInput);
      const msg2 = PaymentProof.buildMessage(sampleInput);
      expect(Buffer.from(msg1).toString("hex")).toBe(Buffer.from(msg2).toString("hex"));
    });

    it("starts with the AEERON_PROOF_V1 prefix", () => {
      const msg = PaymentProof.buildMessage(sampleInput);
      const prefix = Buffer.from("AEERON_PROOF_V1:").toString("hex");
      expect(Buffer.from(msg).toString("hex").startsWith(prefix)).toBe(true);
    });

    it("differs when amount changes", () => {
      const msg1 = PaymentProof.buildMessage({ ...sampleInput, amount: 1_000_000 });
      const msg2 = PaymentProof.buildMessage({ ...sampleInput, amount: 2_000_000 });
      expect(Buffer.from(msg1).toString("hex")).not.toBe(Buffer.from(msg2).toString("hex"));
    });
  });

  describe("sign + verify", () => {
    it("verifies a signature produced by sign()", () => {
      const sig = PaymentProof.sign(sampleInput, keypair.secretKey);

      const proof = {
        signature: sig,
        txHash: "txHashPlaceholder",
        nonce: sampleInput.nonce,
        timestamp: Math.floor(Date.now() / 1000),
      };

      const details = {
        payee: sampleInput.payee,
        amount: sampleInput.amount,
        token: "SOL" as const,
        nonce: sampleInput.nonce,
        expiry: sampleInput.expiry,
        network: "mainnet-beta" as const,
        version: 1 as const,
      };

      expect(PaymentProof.verify(proof, details, payerPublicKey)).toBe(true);
    });

    it("rejects a tampered amount", () => {
      const sig = PaymentProof.sign(sampleInput, keypair.secretKey);

      const proof = {
        signature: sig,
        txHash: "txHashPlaceholder",
        nonce: sampleInput.nonce,
        timestamp: Math.floor(Date.now() / 1000),
      };

      const tamperedDetails = {
        payee: sampleInput.payee,
        amount: sampleInput.amount + 1, // tampered
        token: "SOL" as const,
        nonce: sampleInput.nonce,
        expiry: sampleInput.expiry,
        network: "mainnet-beta" as const,
        version: 1 as const,
      };

      expect(PaymentProof.verify(proof, tamperedDetails, payerPublicKey)).toBe(false);
    });

    it("returns false for an invalid signature string", () => {
      const proof = {
        signature: "notavalidsignature",
        txHash: "txHashPlaceholder",
        nonce: sampleInput.nonce,
        timestamp: Math.floor(Date.now() / 1000),
      };

      const details = {
        payee: sampleInput.payee,
        amount: sampleInput.amount,
        token: "SOL" as const,
        nonce: sampleInput.nonce,
        expiry: sampleInput.expiry,
        network: "mainnet-beta" as const,
        version: 1 as const,
      };

      expect(PaymentProof.verify(proof, details, payerPublicKey)).toBe(false);
    });
  });

  describe("isExpired", () => {
    it("returns false when proof is within expiry", () => {
      const proof = {
        signature: "",
        txHash: "",
        nonce: sampleInput.nonce,
        timestamp: Math.floor(Date.now() / 1000),
      };
      const details = { ...sampleInput, token: "SOL" as const, network: "mainnet-beta" as const, version: 1 as const };
      expect(PaymentProof.isExpired(proof, details)).toBe(false);
    });

    it("returns true when proof is past expiry", () => {
      const proof = {
        signature: "",
        txHash: "",
        nonce: sampleInput.nonce,
        timestamp: Math.floor(Date.now() / 1000) - 1000,
      };
      const pastDetails = {
        ...sampleInput,
        expiry: Math.floor(Date.now() / 1000) - 1,
        token: "SOL" as const,
        network: "mainnet-beta" as const,
        version: 1 as const,
      };
      expect(PaymentProof.isExpired(proof, pastDetails)).toBe(true);
    });
  });
});
