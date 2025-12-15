use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;

declare_id!("AER1onXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");

#[program]
pub mod aeeron_protocol {
    use super::*;

    /// Initialize a new payment channel between a payer and payee.
    /// The payer deposits collateral into an escrow vault.
    pub fn open_channel(
        ctx: Context<OpenChannel>,
        params: OpenChannelParams,
    ) -> Result<()> {
        instructions::open_channel::handler(ctx, params)
    }

    /// Fund an existing channel with additional lamports or SPL tokens.
    pub fn fund_channel(
        ctx: Context<FundChannel>,
        amount: u64,
    ) -> Result<()> {
        instructions::fund_channel::handler(ctx, amount)
    }

    /// Settle a payment against a channel using a signed payment proof.
    /// Verifies the x402 nonce has not been used and the signature is valid.
    pub fn settle_payment(
        ctx: Context<SettlePayment>,
        params: SettlePaymentParams,
    ) -> Result<()> {
        instructions::settle_payment::handler(ctx, params)
    }

    /// Close a channel and return remaining collateral to the payer.
    pub fn close_channel(
        ctx: Context<CloseChannel>,
    ) -> Result<()> {
        instructions::close_channel::handler(ctx)
    }

    /// Register a nonce to prevent replay attacks.
    /// Called by the resource server after receiving payment proof.
    pub fn register_nonce(
        ctx: Context<RegisterNonce>,
        nonce: [u8; 32],
        expiry: i64,
    ) -> Result<()> {
        instructions::register_nonce::handler(ctx, nonce, expiry)
    }

    /// Execute a direct payment without a channel (pay-per-request).
    pub fn direct_pay(
        ctx: Context<DirectPay>,
        params: DirectPayParams,
    ) -> Result<()> {
        instructions::direct_pay::handler(ctx, params)
    }

    /// Create an on-chain receipt for auditing and composability.
    pub fn emit_receipt(
        ctx: Context<EmitReceipt>,
        params: EmitReceiptParams,
    ) -> Result<()> {
        instructions::emit_receipt::handler(ctx, params)
    }
}
