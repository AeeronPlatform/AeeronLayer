import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import BN from "bn.js";

interface DirectPayTransactionParams {
  connection: Connection;
  payer: PublicKey;
  payee: PublicKey;
  amount: number;
  nonce: Buffer;
  proofExpiry: number;
  programId: PublicKey;
}

/**
 * Build a Solana Transaction for a direct (non-channel) x402 payment.
 */
export async function buildDirectPayTransaction(
  params: DirectPayTransactionParams
): Promise<{ transaction: Transaction; nonce: Buffer }> {
  const {
    connection,
    payer,
    payee,
    amount,
    nonce,
    proofExpiry,
    programId,
  } = params;

  const [nonceRecordPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("nonce"), nonce],
    programId
  );

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  // Instruction discriminator for direct_pay (first 8 bytes of sha256("global:direct_pay"))
  const DIRECT_PAY_DISCRIMINATOR = Buffer.from([0xd4, 0x2e, 0x7a, 0x1f, 0x8b, 0x3c, 0x91, 0x05]);

  // Encode instruction data
  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(BigInt(amount));

  const expiryBuf = Buffer.alloc(8);
  expiryBuf.writeBigInt64LE(BigInt(proofExpiry));

  // Placeholder 64-byte signature (real impl would pre-sign off-chain)
  const signatureBuf = Buffer.alloc(64, 0);

  const data = Buffer.concat([
    DIRECT_PAY_DISCRIMINATOR,
    amountBuf,
    nonce,
    signatureBuf,
    expiryBuf,
  ]);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: payee, isSigner: false, isWritable: true },
      { pubkey: nonceRecordPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    ],
    data,
  });

  const transaction = new Transaction({
    recentBlockhash: blockhash,
    feePayer: payer,
    lastValidBlockHeight,
  }).add(instruction);

  return { transaction, nonce };
}
