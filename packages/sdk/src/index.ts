export { AeeronClient } from "./client/AeeronClient";
export { PaymentProof } from "./protocol/PaymentProof";
export { PaymentDetails } from "./protocol/PaymentDetails";
export { X402Codec } from "./protocol/X402Codec";
export { ChannelManager } from "./client/ChannelManager";

export type {
  AeeronClientConfig,
  FetchWithPaymentOptions,
  PaymentToken,
  PaymentProofData,
  PaymentDetailsData,
  ChannelState,
  SettlementResult,
} from "./types";

export { AEERON_PROGRAM_ID, SUPPORTED_TOKENS, DEFAULT_PROOF_TTL_SECONDS } from "./constants";
