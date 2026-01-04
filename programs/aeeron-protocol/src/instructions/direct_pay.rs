use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::AeeronError;
use crate::state::{NonceRecord, PaymentSettledEvent};
use crate::utils::verify_payment_proof;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DirectPayParams {
    pub amount: u64,
    pub nonce: [u8; 32],
    pub proof_signature: [u8; 64],
    pub proof_expiry: i64,
}

#[derive(Accounts)]
#[instruction(params: DirectPayParams)]
pub struct DirectPay<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: payee is the intended recipient declared in the payment proof.
    #[account(mut)]
    pub payee: UncheckedAccount<'info>,

    #[account(
        init,
        payer = payer,
        space = NonceRecord::LEN,
        seeds = [b"nonce", params.nonce.as_ref()],
        bump,
    )]
    pub nonce_record: Account<'info, NonceRecord>,

    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn handler(ctx: Context<DirectPay>, params: DirectPayParams) -> Result<()> {
    let clock = &ctx.accounts.clock;

    require!(
        clock.unix_timestamp <= params.proof_expiry,
        AeeronError::ProofExpired
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
    nonce_record.expiry = params.proof_expiry + 86_400;
    nonce_record.bump = ctx.bumps.nonce_record;

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.payer.to_account_info(),
                to: ctx.accounts.payee.to_account_info(),
            },
        ),
        params.amount,
    )?;

    emit!(PaymentSettledEvent {
        payer: ctx.accounts.payer.key(),
        payee: ctx.accounts.payee.key(),
        amount: params.amount,
        token_mint: None,
        nonce: params.nonce,
        channel: None,
        settled_at: clock.unix_timestamp,
    });

    msg!(
        "aeeron: direct_pay payer={} payee={} amount={}",
        ctx.accounts.payer.key(),
        ctx.accounts.payee.key(),
        params.amount,
    );

    Ok(())
}
