import { describe, it, expect } from 'vitest';
  import { IntentBuilder, verifyIntent } from '../intent';

  const SESSION_TOKEN = 'test-session-secret-32-chars-long!!';
  const PAYER         = 'A'.repeat(44);
  const RECIPIENT     = 'B'.repeat(44);

  function buildValidIntent(overrides: Partial<Parameters<IntentBuilder['capability']>[1]> = {}) {
    return new IntentBuilder()
      .payer(PAYER)
      .recipient(RECIPIENT)
      .agent('agent_test_v1')
      .capability('summarize', { text: 'hello', ...overrides })
      .maxAmount(100_000n)
      .rail('sol')
      .ttl(60_000)
      .build(SESSION_TOKEN);
  }

  describe('IntentBuilder', () => {
    it('builds a valid intent with all required fields', () => {
      const intent = buildValidIntent();
      expect(intent.intentId).toHaveLength(36);
      expect(intent.payer).toBe(PAYER);
      expect(intent.recipient).toBe(RECIPIENT);
      expect(intent.agentId).toBe('agent_test_v1');
      expect(intent.capability).toBe('summarize');
      expect(intent.maxAmountLamports).toBe('100000');
      expect(intent.rail).toBe('sol');
      expect(intent.signature).toHaveLength(64);
      expect(intent.nonce).toHaveLength(36);
      expect(intent.payloadHash).toHaveLength(64);
    });

    it('throws when required field is missing', () => {
      expect(() =>
        new IntentBuilder().payer(PAYER).build(SESSION_TOKEN)
      ).toThrow('IntentBuilder: missing field');
    });

    it('sets AEERON_MINT when rail = spl', () => {
      const intent = new IntentBuilder()
        .payer(PAYER).recipient(RECIPIENT).agent('a').capability('b')
        .maxAmount(1n).rail('spl').ttl(30_000)
        .build(SESSION_TOKEN);
      expect(intent.mint).toBeTruthy();
      expect(intent.rail).toBe('spl');
    });
  });

  describe('verifyIntent', () => {
    it('accepts a freshly built intent', async () => {
      const intent = buildValidIntent();
      const result = verifyIntent(intent, SESSION_TOKEN);
      expect(result.ok).toBe(true);
    });

    it('rejects an expired intent', () => {
      const intent = buildValidIntent();
      (intent as { expiresAt: number }).expiresAt = Date.now() - 1;
      const result = verifyIntent(intent, SESSION_TOKEN);
      expect(result.ok).toBe(false);
      expect((result as { error: string }).error).toContain('expired');
    });

    it('rejects a tampered signature', () => {
      const intent = buildValidIntent();
      intent.signature = 'a'.repeat(64);
      const result = verifyIntent(intent, SESSION_TOKEN);
      expect(result.ok).toBe(false);
      expect((result as { error: string }).error).toContain('signature');
    });

    it('rejects when amount exceeds ceiling', () => {
      const intent = buildValidIntent();
      const result = verifyIntent(intent, SESSION_TOKEN, { maxAmountLamports: 50_000n });
      expect(result.ok).toBe(false);
      expect((result as { error: string }).error).toContain('maxAmountLamports');
    });

    it('rejects wrong session token', () => {
      const intent = buildValidIntent();
      const result = verifyIntent(intent, 'wrong-token');
      expect(result.ok).toBe(false);
    });
  });
  