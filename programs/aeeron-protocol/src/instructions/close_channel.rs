use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::AeeronError;
use crate::state::{ChannelClosedEvent, PaymentChannel};

#[derive(Accounts)]
pub struct CloseChannel<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        has_one = payer,
        constraint = channel.is_open @ AeeronError::ChannelInactive,
        close = payer,
    )]
    pub channel: Account<'info, PaymentChannel>,

    #[account(
        mut,
        seeds = [b"vault", channel.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn handler(ctx: Context<CloseChannel>) -> Result<()> {
    let channel = &mut ctx.accounts.channel;
    let refund = channel.available_balance();

    channel.is_open = false;

    if refund > 0 {
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
                    to: ctx.accounts.payer.to_account_info(),
                },
                vault_seeds,
            ),
            refund,
        )?;
    }

    emit!(ChannelClosedEvent {
        channel: ctx.accounts.channel.key(),
        payer: channel.payer,
        payee: channel.payee,
        total_settled: channel.settled,
        refunded: refund,
    });

    msg!(
        "aeeron: channel closed settled={} refunded={}",
        channel.settled,
        refund,
    );

    Ok(())
}
