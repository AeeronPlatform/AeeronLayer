use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::AeeronError;
use crate::state::{NonceRecord, PaymentChannel, PaymentSettledEvent};
use crate::utils::verify_payment_proof;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SettlePaymentParams {
    /// Amount to transfer (lamports or token base units).
    pub amount: u64,
    /// The x402 nonce from the payment proof.
    pub nonce: [u8; 32],
    /// Ed25519 signature over (nonce + amount + payee + expiry).
    pub proof_signature: [u8; 64],
    /// Unix timestamp when the payment proof expires.
    pub proof_expiry: i64,
}

#[derive(Accounts)]
#[instruction(params: SettlePaymentParams)]
pub struct SettlePayment<'info> {
    /// Payee must sign to claim the payment.
    #[account(mut)]
    pub payee: Signer<'info>,

    /// CHECK: payer is read from the channel account.
    pub payer: UncheckedAccount<'info>,

    #[account(
        mut,
        has_one = payer,
        has_one = payee,
        constraint = channel.is_open @ AeeronError::ChannelInactive,
    )]
    pub channel: Account<'info, PaymentChannel>,

    #[account(
        mut,
        seeds = [b"vault", channel.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        init,
        payer = payee,
        space = NonceRecord::LEN,
        seeds = [b"nonce", params.nonce.as_ref()],
        bump,
    )]
    pub nonce_record: Account<'info, NonceRecord>,

    pub system_program: Program<'info, System>,

    pub clock: Sysvar<'info, Clock>,
}

pub fn handler(ctx: Context<SettlePayment>, params: SettlePaymentParams) -> Result<()> {
    let clock = &ctx.accounts.clock;

    require!(
        clock.unix_timestamp <= params.proof_expiry,
        AeeronError::ProofExpired
    );

    let channel = &ctx.accounts.channel;
    require!(
        !channel.is_expired(clock),
        AeeronError::ChannelExpired
    );
    require!(
        channel.available_balance() >= params.amount,
        AeeronError::InsufficientBalance
    );
    require!(params.amount > 0, AeeronError::ZeroAmount);

    verify_payment_proof(
        &ctx.accounts.payer.key(),
        &ctx.accounts.payee.key(),
        params.amount,
        &params.nonce,
        params.proof_expiry,
        &params.proof_signature,
    )?;

    let nonce_record = &mut ctx.accounts.nonce_record;
    nonce_record.nonce = params.nonce;
    nonce_record.payer = ctx.accounts.payer.key();
    nonce_record.expiry = params.proof_expiry + 86_400; // retain 24h past proof expiry
    nonce_record.bump = ctx.bumps.nonce_record;

    let channel = &mut ctx.accounts.channel;
    channel.settled = channel
        .settled
        .checked_add(params.amount)
        .ok_or(AeeronError::ArithmeticOverflow)?;
    channel.sequence += 1;

    let vault_seeds: &[&[&[u8]]] = &[&[
        b"vault",
        channel.to_account_info().key.as_ref(),
        &[ctx.bumps.vault],
    ]];

    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.payee.to_account_info(),
            },
            vault_seeds,
        ),
        params.amount,
    )?;

    emit!(PaymentSettledEvent {
        payer: ctx.accounts.payer.key(),
        payee: ctx.accounts.payee.key(),
        amount: params.amount,
        token_mint: None,
        nonce: params.nonce,
        channel: Some(ctx.accounts.channel.key()),
        settled_at: clock.unix_timestamp,
    });

    msg!(
        "aeeron: settled amount={} nonce={:?} seq={}",
        params.amount,
        &params.nonce[..8],
        channel.sequence,
    );

    Ok(())
}
