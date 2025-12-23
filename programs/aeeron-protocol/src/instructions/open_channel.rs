use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::errors::AeeronError;
use crate::state::{ChannelOpenedEvent, PaymentChannel};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct OpenChannelParams {
    /// Initial collateral amount (lamports or token units).
    pub initial_amount: u64,
    /// Unix timestamp when channel expires (0 = no expiry).
    pub expiry: i64,
}

#[derive(Accounts)]
#[instruction(params: OpenChannelParams)]
pub struct OpenChannel<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: payee is validated by the payer — they choose who to pay.
    pub payee: UncheckedAccount<'info>,

    #[account(
        init,
        payer = payer,
        space = PaymentChannel::LEN,
        seeds = [
            b"channel",
            payer.key().as_ref(),
            payee.key().as_ref(),
        ],
        bump,
    )]
    pub channel: Account<'info, PaymentChannel>,

    /// Escrow vault that holds the channel's SOL collateral.
    #[account(
        mut,
        seeds = [b"vault", channel.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,

    /// Optionally provided for SPL token channels.
    pub token_program: Option<Program<'info, Token>>,
}

pub fn handler(ctx: Context<OpenChannel>, params: OpenChannelParams) -> Result<()> {
    require!(params.initial_amount > 0, AeeronError::ZeroAmount);

    let channel = &mut ctx.accounts.channel;
    channel.payer = ctx.accounts.payer.key();
    channel.payee = ctx.accounts.payee.key();
    channel.token_mint = None;
    channel.balance = params.initial_amount;
    channel.settled = 0;
    channel.sequence = 0;
    channel.expiry = params.expiry;
    channel.is_open = true;
    channel.bump = ctx.bumps.channel;

    // Transfer initial collateral to the vault.
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.payer.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        params.initial_amount,
    )?;

    emit!(ChannelOpenedEvent {
        channel: channel.key(),
        payer: channel.payer,
        payee: channel.payee,
        initial_balance: params.initial_amount,
        expiry: params.expiry,
    });

    msg!(
        "aeeron: channel opened payer={} payee={} balance={}",
        channel.payer,
        channel.payee,
        channel.balance
    );

    Ok(())
}
