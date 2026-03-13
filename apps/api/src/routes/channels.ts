import { Router } from "express";
import { z } from "zod";
import { PublicKey } from "@solana/web3.js";
import { getConnection, PROGRAM_ID } from "../lib/solana";
import { validateBody } from "../middleware/validateBody";
import { validateParams } from "../middleware/validateParams";

export const channelsRouter = Router();

/**
 * GET /v1/channels/:channelAddress
 * Fetch the current on-chain state of a payment channel.
 */
channelsRouter.get("/:channelAddress", async (req, res) => {
  const { channelAddress } = req.params;

  try {
    const pubkey = new PublicKey(channelAddress);
    const connection = getConnection();
    const accountInfo = await connection.getAccountInfo(pubkey);

    if (!accountInfo) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    // In production: deserialize with Anchor's account decoder
    res.json({
      address: channelAddress,
      owner: accountInfo.owner.toBase58(),
      lamports: accountInfo.lamports,
      dataLength: accountInfo.data.length,
      executable: accountInfo.executable,
    });
  } catch (err) {
    res.status(400).json({ error: "Invalid channel address" });
  }
});

const ChannelPdaSchema = z.object({
  payer: z.string().min(32).max(44),
  payee: z.string().min(32).max(44),
});

/**
 * POST /v1/channels/pda
 * Derive the channel PDA address for a (payer, payee) pair.
 */
channelsRouter.post(
  "/pda",
  validateBody(ChannelPdaSchema),
  (req, res) => {
    const { payer, payee } = req.body;

    try {
      const payerPk = new PublicKey(payer);
      const payeePk = new PublicKey(payee);

      const [channelPda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("channel"), payerPk.toBuffer(), payeePk.toBuffer()],
        PROGRAM_ID
      );

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), channelPda.toBuffer()],
        PROGRAM_ID
      );

      res.json({
        channel: channelPda.toBase58(),
        vault: vaultPda.toBase58(),
        bump,
        payer,
        payee,
      });
    } catch {
      res.status(400).json({ error: "Invalid payer or payee address" });
    }
  }
);
