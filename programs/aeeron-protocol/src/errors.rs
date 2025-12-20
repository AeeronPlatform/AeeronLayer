use anchor_lang::prelude::*;

#[error_code]
pub enum AeeronError {
    #[msg("Channel is closed or expired")]
    ChannelInactive,

    #[msg("Insufficient channel balance for this payment")]
    InsufficientBalance,

    #[msg("Payment nonce has already been used")]
    NonceAlreadyUsed,

    #[msg("Payment nonce has expired")]
    NonceExpired,

    #[msg("Invalid payment proof signature")]
    InvalidSignature,

    #[msg("Payment amount is zero")]
    ZeroAmount,

    #[msg("Payment amount exceeds channel balance")]
    AmountExceedsBalance,

    #[msg("Channel sequence number mismatch")]
    SequenceMismatch,

    #[msg("Channel has expired")]
    ChannelExpired,

    #[msg("Only the payer can perform this action")]
    UnauthorizedPayer,

    #[msg("Only the payee can perform this action")]
    UnauthorizedPayee,

    #[msg("Token mint mismatch — channel was opened with a different token")]
    TokenMintMismatch,

    #[msg("Payment proof has expired")]
    ProofExpired,

    #[msg("Invalid nonce length")]
    InvalidNonce,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}
