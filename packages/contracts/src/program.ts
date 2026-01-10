import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, type Wallet } from "@coral-xyz/anchor";
import { IDL, type AeeronProtocol } from "./idl";

export const AEERON_PROGRAM_ID = new PublicKey(
  "AER1onXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
);

export function getAeeronProgram(
  connection: Connection,
  wallet: Wallet,
  programId: PublicKey = AEERON_PROGRAM_ID
): Program<AeeronProtocol> {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  return new Program<AeeronProtocol>(IDL, programId, provider);
}
