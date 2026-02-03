import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import type { ChannelState } from "../types";

interface ChannelManagerConfig {
  connection: Connection;
  payer: Keypair;
  programId: PublicKey;
}

/**
 * Manages payment channels for repeated micro-payments.
 * Channels reduce per-request on-chain overhead by pre-funding a vault.
 */
export class ChannelManager {
  private connection: Connection;
  private payer: Keypair;
  private programId: PublicKey;

  constructor(config: ChannelManagerConfig) {
    this.connection = config.connection;
    this.payer = config.payer;
    this.programId = config.programId;
  }

  /**
   * Derive the channel PDA for a (payer, payee) pair.
   */
  channelAddress(payee: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("channel"),
        this.payer.publicKey.toBuffer(),
        payee.toBuffer(),
      ],
      this.programId
    );
  }

  /**
   * Derive the vault PDA for a channel.
   */
  vaultAddress(channelAddress: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), channelAddress.toBuffer()],
      this.programId
    );
  }

  /**
   * Open a new payment channel with the given payee.
   */
  async openChannel(
    payee: PublicKey,
    initialAmount: number,
    expiry: number = 0
  ): Promise<{ channelAddress: PublicKey; txHash: string }> {
    const [channelAddress] = this.channelAddress(payee);

    const { blockhash } = await this.connection.getLatestBlockhash();

    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: this.payer.publicKey });

    // In a real implementation this would use the Anchor-generated instruction builder.
    // Shown as a placeholder illustrating the channel open CPI structure.
    tx.add(
      SystemProgram.transfer({
        fromPubkey: this.payer.publicKey,
        toPubkey: channelAddress,
        lamports: initialAmount,
      })
    );

    tx.sign(this.payer);

    const txHash = await this.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    await this.connection.confirmTransaction(txHash, "confirmed");

    return { channelAddress, txHash };
  }

  /**
   * Fund an existing channel with additional lamports.
   */
  async fundChannel(payee: PublicKey, amount: number): Promise<string> {
    const [channelAddress] = this.channelAddress(payee);
    const [vaultAddress] = this.vaultAddress(channelAddress);

    const { blockhash } = await this.connection.getLatestBlockhash();
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: this.payer.publicKey });

    tx.add(
      SystemProgram.transfer({
        fromPubkey: this.payer.publicKey,
        toPubkey: vaultAddress,
        lamports: amount,
      })
    );

    tx.sign(this.payer);
    const txHash = await this.connection.sendRawTransaction(tx.serialize());
    await this.connection.confirmTransaction(txHash, "confirmed");
    return txHash;
  }

  /**
   * Close a channel and reclaim remaining collateral.
   */
  async closeChannel(payee: PublicKey): Promise<string> {
    const [channelAddress] = this.channelAddress(payee);

    const { blockhash } = await this.connection.getLatestBlockhash();
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: this.payer.publicKey });

    // Real impl: call aeeron_protocol::close_channel instruction
    tx.sign(this.payer);
    const txHash = await this.connection.sendRawTransaction(tx.serialize());
    await this.connection.confirmTransaction(txHash, "confirmed");
    return txHash;
  }

  /**
   * Fetch the current on-chain state of a channel.
   */
  async getChannel(payee: PublicKey): Promise<ChannelState | null> {
    const [channelAddress] = this.channelAddress(payee);
    const accountInfo = await this.connection.getAccountInfo(channelAddress);

    if (!accountInfo) return null;

    // Real impl: deserialize with Anchor's account decoder
    return {
      address: channelAddress.toBase58(),
      payer: this.payer.publicKey.toBase58(),
      payee: payee.toBase58(),
      balance: 0,
      settled: 0,
      available: 0,
      sequence: 0,
      expiry: 0,
      isOpen: true,
    };
  }
}
