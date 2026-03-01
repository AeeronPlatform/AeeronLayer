import { Connection, PublicKey } from "@solana/web3.js";

const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
const NETWORK = (process.env.SOLANA_NETWORK ?? "mainnet-beta") as
  | "mainnet-beta"
  | "devnet"
  | "localnet";

let _connection: Connection | null = null;

export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(RPC_URL, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 60_000,
    });
  }
  return _connection;
}

export const PROGRAM_ID = new PublicKey(
  process.env.AEERON_PROGRAM_ID ?? "AER1onXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
);

export { NETWORK };
