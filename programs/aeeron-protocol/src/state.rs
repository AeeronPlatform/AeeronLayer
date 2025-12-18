use anchor_lang::prelude::*;

/// Represents an open payment channel between a payer and payee.
#[account]
#[derive(Default)]
pub struct PaymentChannel {
    /// The wallet that opened and funds this channel.
    pub payer: Pubkey,
    /// The wallet that receives payments through this channel.
    pub payee: Pubkey,
    /// SPL token mint (None = native SOL).
    pub token_mint: Option<Pubkey>,
    /// Total lamports (or token units) deposited in the escrow vault.
    pub balance: u64,
    /// Cumulative amount settled out of this channel.
    pub settled: u64,
    /// Channel sequence number — monotonically increases with each settlement.
    pub sequence: u64,
    /// Unix timestamp when this channel expires (0 = no expiry).
    pub expiry: i64,
    /// Whether the channel is currently active.
    pub is_open: bool,
    /// Bump seed for the channel PDA.
    pub bump: u8,
}

impl PaymentChannel {
    pub const LEN: usize = 8   // discriminator
        + 32   // payer
        + 32   // payee
        + 1 + 32 // Option<Pubkey> token_mint
        + 8    // balance
        + 8    // settled
        + 8    // sequence
        + 8    // expiry
        + 1    // is_open
        + 1;   // bump

    pub fn available_balance(&self) -> u64 {
        self.balance.saturating_sub(self.settled)
    }

    pub fn is_expired(&self, clock: &Clock) -> bool {
        self.expiry > 0 && clock.unix_timestamp > self.expiry
    }
}

/// Nonce record — prevents replay attacks on payment proofs.
#[account]
pub struct NonceRecord {
    /// The nonce value (32 bytes, typically a random UUID or hash).
    pub nonce: [u8; 32],
    /// The payer who used this nonce.
    pub payer: Pubkey,
    /// Unix timestamp when this nonce expires and can be garbage collected.
    pub expiry: i64,
    /// Bump seed for the nonce PDA.
    pub bump: u8,
}

impl NonceRecord {
    pub const LEN: usize = 8   // discriminator
        + 32   // nonce
        + 32   // payer
        + 8    // expiry
        + 1;   // bump
}

/// On-chain receipt for a completed payment.
/// Emitted via an event and optionally stored for composability.
#[account]
pub struct PaymentReceipt {
    /// Transaction signature of the settlement.
    pub tx_signature: [u8; 64],
    /// Payer wallet.
    pub payer: Pubkey,
    /// Payee wallet.
    pub payee: Pubkey,
    /// Amount paid (lamports or token base units).
    pub amount: u64,
    /// Token mint (None = SOL).
    pub token_mint: Option<Pubkey>,
    /// The nonce from the x402 payment proof.
    pub nonce: [u8; 32],
    /// Unix timestamp of settlement.
    pub settled_at: i64,
    /// Bump seed.
    pub bump: u8,
}

impl PaymentReceipt {
    pub const LEN: usize = 8   // discriminator
        + 64   // tx_signature
        + 32   // payer
        + 32   // payee
        + 8    // amount
        + 1 + 32 // Option<Pubkey> token_mint
        + 32   // nonce
        + 8    // settled_at
        + 1;   // bump
}

/// Emitted as a Solana program log event on every successful payment.
#[event]
pub struct PaymentSettledEvent {
    pub payer: Pubkey,
    pub payee: Pubkey,
    pub amount: u64,
    pub token_mint: Option<Pubkey>,
    pub nonce: [u8; 32],
    pub channel: Option<Pubkey>,
    pub settled_at: i64,
}

/// Emitted when a channel is opened.
#[event]
pub struct ChannelOpenedEvent {
    pub channel: Pubkey,
    pub payer: Pubkey,
    pub payee: Pubkey,
    pub initial_balance: u64,
    pub expiry: i64,
}

/// Emitted when a channel is closed.
#[event]
pub struct ChannelClosedEvent {
    pub channel: Pubkey,
    pub payer: Pubkey,
    pub payee: Pubkey,
    pub total_settled: u64,
    pub refunded: u64,
}
