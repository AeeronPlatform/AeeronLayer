use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::AeeronError;
use crate::state::PaymentChannel;

#[derive(Accounts)]
pub struct FundChannel<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        has_one = payer,
        constraint = channel.is_open @ AeeronError::ChannelInactive,
    )]
    pub channel: Account<'info, PaymentChannel>,

    #[account(
        mut,
        seeds = [b"vault", channel.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<FundChannel>, amount: u64) -> Result<()> {
    require!(amount > 0, AeeronError::ZeroAmount);

    let channel = &mut ctx.accounts.channel;
    channel.balance = channel
        .balance
        .checked_add(amount)
        .ok_or(AeeronError::ArithmeticOverflow)?;

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.payer.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        amount,
    )?;

    msg!("aeeron: funded channel amount={} new_balance={}", amount, channel.balance);

    Ok(())
}
