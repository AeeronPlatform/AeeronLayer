use anchor_lang::prelude::*;

use crate::errors::AeeronError;
use crate::state::NonceRecord;

#[derive(Accounts)]
#[instruction(nonce: [u8; 32], expiry: i64)]
pub struct RegisterNonce<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = NonceRecord::LEN,
        seeds = [b"nonce", nonce.as_ref()],
        bump,
    )]
    pub nonce_record: Account<'info, NonceRecord>,

    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn handler(ctx: Context<RegisterNonce>, nonce: [u8; 32], expiry: i64) -> Result<()> {
    require!(
        expiry > ctx.accounts.clock.unix_timestamp,
        AeeronError::NonceExpired
    );

    let record = &mut ctx.accounts.nonce_record;
    record.nonce = nonce;
    record.payer = ctx.accounts.authority.key();
    record.expiry = expiry;
    record.bump = ctx.bumps.nonce_record;

    msg!("aeeron: nonce registered expiry={}", expiry);

    Ok(())
}
