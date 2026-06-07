import * as anchor from '@coral-xyz/anchor';
  import { Program } from '@coral-xyz/anchor';
  import { AeeronVerifier } from '../target/types/aeeron_verifier';
  import {
    Keypair, LAMPORTS_PER_SOL, PublicKey,
    SystemProgram,
  } from '@solana/web3.js';
  import { assert } from 'chai';

  describe('aeeron-verifier', () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.AeeronVerifier as Program<AeeronVerifier>;
    const payer     = (provider.wallet as anchor.Wallet).payer;
    const recipient = Keypair.generate();

    // Shared intent ID across tests
    const intentId  = Array.from(Buffer.from('test-intent-0001-0000-0000-000000000001'));
    const agentHash = Array.from(Buffer.alloc(32, 1));
    const capHash   = Array.from(Buffer.alloc(32, 2));

    before(async () => {
      // Fund recipient so it exists on-chain
      const sig = await provider.connection.requestAirdrop(recipient.publicKey, 0.1 * LAMPORTS_PER_SOL);
      await provider.connection.confirmTransaction(sig, 'confirmed');
    });

    it('settles a SOL payment and writes PaymentRecord', async () => {
      const [nonceRecord]   = PublicKey.findProgramAddressSync([Buffer.from('nonce'),   Buffer.from(intentId)], program.programId);
      const [paymentRecord] = PublicKey.findProgramAddressSync([Buffer.from('payment'), Buffer.from(intentId)], program.programId);

      const amountLamports   = new anchor.BN(100_000);
      const expiresAt        = new anchor.BN(Math.floor(Date.now() / 1000) + 60);

      const before = await provider.connection.getBalance(recipient.publicKey);

      await program.methods
        .settleSol({
          intentId,
          amountLamports,
          expiresAt,
          agentIdHash:   agentHash,
          capabilityHash: capHash,
        })
        .accounts({
          payer:          payer.publicKey,
          recipient:      recipient.publicKey,
          nonceRecord,
          paymentRecord,
          systemProgram:  SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      const after = await provider.connection.getBalance(recipient.publicKey);
      assert.equal(after - before, 100_000, 'recipient balance increased');

      const record = await program.account.paymentRecord.fetch(paymentRecord);
      assert.equal(record.amountLamports.toNumber(), 100_000);
      assert.ok(record.payer.equals(payer.publicKey));
      assert.ok(record.recipient.equals(recipient.publicKey));

      const nonce = await program.account.nonceRecord.fetch(nonceRecord);
      assert.isTrue(nonce.used, 'nonce marked used');
    });

    it('rejects a duplicate intent (nonce replay)', async () => {
      const [nonceRecord]   = PublicKey.findProgramAddressSync([Buffer.from('nonce'),   Buffer.from(intentId)], program.programId);
      const [paymentRecord] = PublicKey.findProgramAddressSync([Buffer.from('payment'), Buffer.from(intentId)], program.programId);

      try {
        await program.methods
          .settleSol({
            intentId,
            amountLamports: new anchor.BN(50_000),
            expiresAt:      new anchor.BN(Math.floor(Date.now() / 1000) + 60),
            agentIdHash:    agentHash,
            capabilityHash: capHash,
          })
          .accounts({ payer: payer.publicKey, recipient: recipient.publicKey, nonceRecord, paymentRecord, systemProgram: SystemProgram.programId })
          .signers([payer])
          .rpc();
        assert.fail('should have thrown NonceAlreadyUsed');
      } catch (err: unknown) {
        assert.include(String(err), 'NonceAlreadyUsed');
      }
    });

    it('rejects an expired intent', async () => {
      const expiredId    = Array.from(Buffer.from('test-intent-expired000000000000000001'));
      const [nonceRecord]   = PublicKey.findProgramAddressSync([Buffer.from('nonce'),   Buffer.from(expiredId)], program.programId);
      const [paymentRecord] = PublicKey.findProgramAddressSync([Buffer.from('payment'), Buffer.from(expiredId)], program.programId);

      try {
        await program.methods
          .settleSol({
            intentId:       expiredId,
            amountLamports: new anchor.BN(1_000),
            expiresAt:      new anchor.BN(Math.floor(Date.now() / 1000) - 10), // past
            agentIdHash:    agentHash,
            capabilityHash: capHash,
          })
          .accounts({ payer: payer.publicKey, recipient: recipient.publicKey, nonceRecord, paymentRecord, systemProgram: SystemProgram.programId })
          .signers([payer])
          .rpc();
        assert.fail('should have thrown IntentExpired');
      } catch (err: unknown) {
        assert.include(String(err), 'IntentExpired');
      }
    });
  });
  