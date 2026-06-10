import { describe, it, expect, vi, beforeEach } from 'vitest';

  // Mock @solana/web3.js Connection before importing ProofVerifier
  vi.mock('@solana/web3.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@solana/web3.js')>();
    return {
      ...actual,
      Connection: vi.fn().mockImplementation(() => ({
        getAccountInfo: vi.fn(),
      })),
    };
  });

  vi.mock('@coral-xyz/anchor', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@coral-xyz/anchor')>();
    return {
      ...actual,
      BorshAccountsCoder: vi.fn().mockImplementation(() => ({
        decode: vi.fn(),
      })),
    };
  });

  import { Connection }          from '@solana/web3.js';
  import { BorshAccountsCoder }  from '@coral-xyz/anchor';
  import { ProofVerifier }       from '../ProofVerifier';

  const INTENT_ID   = '11111111-1111-1111-1111-111111111111';
  const PAYER       = 'A'.repeat(44);
  const RECIPIENT   = 'B'.repeat(44);

  function makeConn(data: Buffer | null) {
    const conn = new (Connection as unknown as new () => { getAccountInfo: ReturnType<typeof vi.fn> })();
    conn.getAccountInfo = vi.fn().mockResolvedValue(data ? { data } : null);
    return conn;
  }
  function makeCoder(decoded: Record<string, unknown>) {
    const c = new (BorshAccountsCoder as unknown as new () => { decode: ReturnType<typeof vi.fn> })(null as never);
    c.decode = vi.fn().mockReturnValue(decoded);
    return c;
  }

  describe('ProofVerifier.verify', () => {
    it('returns NOT_FOUND when PDA account is missing', async () => {
      const verifier = new ProofVerifier('https://api.devnet.solana.com');
      (verifier as unknown as { connection: ReturnType<typeof makeConn> }).connection = makeConn(null);
      const r = await verifier.verify(INTENT_ID);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('NOT_FOUND');
    });

    it('decodes and returns PaymentRecord on success', async () => {
      const { PublicKey } = await import('@solana/web3.js');
      const verifier = new ProofVerifier('https://api.devnet.solana.com');
      (verifier as unknown as { connection: ReturnType<typeof makeConn> }).connection = makeConn(Buffer.alloc(200));
      (verifier as unknown as { coder: ReturnType<typeof makeCoder> }).coder = makeCoder({
        intentId:        Array.from(Buffer.from(INTENT_ID)),
        payer:           new PublicKey(PAYER),
        recipient:       new PublicKey(RECIPIENT),
        amountLamports:  { toString: () => '100000' },
        rail:            { sol: {} },
        settledAt:       BigInt(1_749_000_000),
        agentIdHash:     Array.from(Buffer.alloc(32, 1)),
        capabilityHash:  Array.from(Buffer.alloc(32, 2)),
      });

      const r = await verifier.verify(INTENT_ID);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.record.intentId).toContain(INTENT_ID.replace(/-/g,'').slice(0,8));
        expect(r.record.amountLamports).toBe(100_000n);
        expect(r.record.rail).toBe('sol');
        expect(r.record.payer).toBe(PAYER);
      }
    });
  });

  describe('ProofVerifier.verifyAndAssert', () => {
    it('throws on recipient mismatch', async () => {
      const { PublicKey } = await import('@solana/web3.js');
      const verifier = new ProofVerifier('https://api.devnet.solana.com');
      (verifier as unknown as { connection: ReturnType<typeof makeConn> }).connection = makeConn(Buffer.alloc(200));
      (verifier as unknown as { coder: ReturnType<typeof makeCoder> }).coder = makeCoder({
        intentId:       Array.from(Buffer.from(INTENT_ID)),
        payer:          new PublicKey(PAYER),
        recipient:      new PublicKey(RECIPIENT),
        amountLamports: { toString: () => '100000' },
        rail:           { sol: {} },
        settledAt:      BigInt(1_749_000_000),
        agentIdHash:    Array.from(Buffer.alloc(32)),
        capabilityHash: Array.from(Buffer.alloc(32)),
      });

      await expect(
        verifier.verifyAndAssert({ intentId: INTENT_ID, expectedRecipient: 'C'.repeat(44) })
      ).rejects.toThrow('recipient mismatch');
    });

    it('throws when amount is below minimum', async () => {
      const { PublicKey } = await import('@solana/web3.js');
      const verifier = new ProofVerifier('https://api.devnet.solana.com');
      (verifier as unknown as { connection: ReturnType<typeof makeConn> }).connection = makeConn(Buffer.alloc(200));
      (verifier as unknown as { coder: ReturnType<typeof makeCoder> }).coder = makeCoder({
        intentId:       Array.from(Buffer.from(INTENT_ID)),
        payer:          new PublicKey(PAYER),
        recipient:      new PublicKey(RECIPIENT),
        amountLamports: { toString: () => '1000' },
        rail:           { sol: {} },
        settledAt:      BigInt(1_749_000_000),
        agentIdHash:    Array.from(Buffer.alloc(32)),
        capabilityHash: Array.from(Buffer.alloc(32)),
      });

      await expect(
        verifier.verifyAndAssert({ intentId: INTENT_ID, expectedRecipient: RECIPIENT, minLamports: 100_000n })
      ).rejects.toThrow('insufficient payment');
    });
  });
  