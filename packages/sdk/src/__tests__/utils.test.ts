import { describe, it, expect } from "vitest";
import {
  solToLamports,
  lamportsToSol,
  usdcToBaseUnits,
  baseUnitsToUsdc,
  shortenAddress,
  generateNonce,
} from "../utils";

describe("utils", () => {
  describe("solToLamports", () => {
    it("converts 1 SOL to 1_000_000_000 lamports", () => {
      expect(solToLamports(1)).toBe(1_000_000_000);
    });

    it("converts 0.001 SOL to 1_000_000 lamports", () => {
      expect(solToLamports(0.001)).toBe(1_000_000);
    });
  });

  describe("lamportsToSol", () => {
    it("converts 1_000_000_000 lamports to 1 SOL", () => {
      expect(lamportsToSol(1_000_000_000)).toBe(1);
    });
  });

  describe("usdcToBaseUnits / baseUnitsToUsdc", () => {
    it("round-trips 1.5 USDC", () => {
      const units = usdcToBaseUnits(1.5);
      expect(baseUnitsToUsdc(units)).toBeCloseTo(1.5);
    });
  });

  describe("shortenAddress", () => {
    const addr = "9Fh2ZwKmVqXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

    it("returns first4...last4 by default", () => {
      const short = shortenAddress(addr);
      expect(short).toMatch(/^.{4}\.{3}.{4}$/);
    });

    it("respects the chars parameter", () => {
      const short = shortenAddress(addr, 6);
      expect(short.startsWith(addr.slice(0, 6))).toBe(true);
      expect(short.endsWith(addr.slice(-6))).toBe(true);
    });
  });

  describe("generateNonce", () => {
    it("produces a 64-character hex string", () => {
      const nonce = generateNonce();
      expect(nonce).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(nonce)).toBe(true);
    });

    it("generates unique values", () => {
      const n1 = generateNonce();
      const n2 = generateNonce();
      expect(n1).not.toBe(n2);
    });
  });
});
