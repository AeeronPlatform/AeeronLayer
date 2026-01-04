use anchor_lang::prelude::*;

use crate::state::{PaymentReceipt};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct EmitReceiptParams {
    pub tx_signature: [u8; 64],
    pub payer: Pubkey,
    pub payee: Pubkey,
    pub amount: u64,
    pub token_mint: Option<Pubkey>,
    pub nonce: [u8; 32],
}

#[derive(Accounts)]
#[instruction(params: EmitReceiptParams)]
pub struct EmitReceipt<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = PaymentReceipt::LEN,
        seeds = [b"receipt", params.nonce.as_ref()],
        bump,
    )]
    pub receipt: Account<'info, PaymentReceipt>,

    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn handler(ctx: Context<EmitReceipt>, params: EmitReceiptParams) -> Result<()> {
    let receipt = &mut ctx.accounts.receipt;
    receipt.tx_signature = params.tx_signature;
    receipt.payer = params.payer;
    receipt.payee = params.payee;
    receipt.amount = params.amount;
    receipt.token_mint = params.token_mint;
    receipt.nonce = params.nonce;
    receipt.settled_at = ctx.accounts.clock.unix_timestamp;
    receipt.bump = ctx.bumps.receipt;

    msg!(
        "aeeron: receipt emitted payer={} payee={} amount={}",
        params.payer,
        params.payee,
        params.amount,
    );

    Ok(())
}
