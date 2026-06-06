use anchor_lang::prelude::*;
  use anchor_spl::token::{self, Token, TokenAccount, Transfer};

  declare_id!("AEERnVer1fier111111111111111111111111111111");

  /// Aeeron x402 on-chain verifier program.
  ///
  /// Responsibilities:
  ///   - Atomically settle x402 payment intents on Solana
  ///   - Store a compact proof-of-payment on-chain for agent verification
  ///   - Enforce per-intent nonce uniqueness (replay protection)
  ///   - Emit settlement events consumable by off-chain indexers
  #[program]
  pub mod aeeron_verifier {
      use super::*;

      /// settle_sol
      ///
      /// Transfers native SOL from the payer to the recipient and records
      /// a PaymentRecord on-chain. Called by the Gateway CPI after validating
      /// the off-chain HMAC intent signature.
      pub fn settle_sol(
          ctx: Context<SettleSol>,
          params: SettleParams,
      ) -> Result<()> {
          require!(params.amount_lamports > 0, AeeronError::ZeroAmount);
          require!(
              !ctx.accounts.nonce_record.used,
              AeeronError::NonceAlreadyUsed
          );
          require!(
              Clock::get()?.unix_timestamp < params.expires_at,
              AeeronError::IntentExpired
          );

          // Transfer SOL via system program
          let ix = anchor_lang::solana_program::system_instruction::transfer(
              &ctx.accounts.payer.key(),
              &ctx.accounts.recipient.key(),
              params.amount_lamports,
          );
          anchor_lang::solana_program::program::invoke(
              &ix,
              &[
                  ctx.accounts.payer.to_account_info(),
                  ctx.accounts.recipient.to_account_info(),
              ],
          )?;

          // Mark nonce used
          ctx.accounts.nonce_record.used      = true;
          ctx.accounts.nonce_record.intent_id = params.intent_id;
          ctx.accounts.nonce_record.settled_at = Clock::get()?.unix_timestamp;

          // Write payment record
          let record = &mut ctx.accounts.payment_record;
          record.intent_id         = params.intent_id;
          record.payer             = ctx.accounts.payer.key();
          record.recipient         = ctx.accounts.recipient.key();
          record.amount_lamports   = params.amount_lamports;
          record.rail              = PaymentRail::Sol;
          record.settled_at        = Clock::get()?.unix_timestamp;
          record.agent_id_hash     = params.agent_id_hash;
          record.capability_hash   = params.capability_hash;

          emit!(PaymentSettled {
              intent_id:       params.intent_id,
              payer:           ctx.accounts.payer.key(),
              recipient:       ctx.accounts.recipient.key(),
              amount_lamports: params.amount_lamports,
              rail:            PaymentRail::Sol,
              settled_at:      record.settled_at,
          });

          Ok(())
      }

      /// settle_spl
      ///
      /// Transfers SPL tokens (e.g. $AEERON) from the payer's ATA to the
      /// recipient's ATA and records a PaymentRecord on-chain.
      pub fn settle_spl(
          ctx: Context<SettleSpl>,
          params: SettleParams,
      ) -> Result<()> {
          require!(params.amount_lamports > 0, AeeronError::ZeroAmount);
          require!(
              !ctx.accounts.nonce_record.used,
              AeeronError::NonceAlreadyUsed
          );
          require!(
              Clock::get()?.unix_timestamp < params.expires_at,
              AeeronError::IntentExpired
          );

          // Transfer SPL tokens
          let cpi_ctx = CpiContext::new(
              ctx.accounts.token_program.to_account_info(),
              Transfer {
                  from:      ctx.accounts.payer_ata.to_account_info(),
                  to:        ctx.accounts.recipient_ata.to_account_info(),
                  authority: ctx.accounts.payer.to_account_info(),
              },
          );
          token::transfer(cpi_ctx, params.amount_lamports)?;

          ctx.accounts.nonce_record.used       = true;
          ctx.accounts.nonce_record.intent_id  = params.intent_id;
          ctx.accounts.nonce_record.settled_at = Clock::get()?.unix_timestamp;

          let record = &mut ctx.accounts.payment_record;
          record.intent_id        = params.intent_id;
          record.payer            = ctx.accounts.payer.key();
          record.recipient        = ctx.accounts.recipient.key();
          record.amount_lamports  = params.amount_lamports;
          record.rail             = PaymentRail::Spl;
          record.settled_at       = Clock::get()?.unix_timestamp;
          record.agent_id_hash    = params.agent_id_hash;
          record.capability_hash  = params.capability_hash;

          emit!(PaymentSettled {
              intent_id:       params.intent_id,
              payer:           ctx.accounts.payer.key(),
              recipient:       ctx.accounts.recipient.key(),
              amount_lamports: params.amount_lamports,
              rail:            PaymentRail::Spl,
              settled_at:      record.settled_at,
          });

          Ok(())
      }
  }

  // ─── Accounts ─────────────────────────────────────────────────────────────────

  #[derive(Accounts)]
  #[instruction(params: SettleParams)]
  pub struct SettleSol<'info> {
      #[account(mut)]
      pub payer: Signer<'info>,

      /// CHECK: recipient wallet validated off-chain via HMAC intent
      #[account(mut)]
      pub recipient: UncheckedAccount<'info>,

      #[account(
          init_if_needed,
          payer = payer,
          space = NonceRecord::LEN,
          seeds = [b"nonce", params.intent_id.as_bytes()],
          bump,
      )]
      pub nonce_record: Account<'info, NonceRecord>,

      #[account(
          init,
          payer = payer,
          space = PaymentRecord::LEN,
          seeds = [b"payment", params.intent_id.as_bytes()],
          bump,
      )]
      pub payment_record: Account<'info, PaymentRecord>,

      pub system_program: Program<'info, System>,
  }

  #[derive(Accounts)]
  #[instruction(params: SettleParams)]
  pub struct SettleSpl<'info> {
      #[account(mut)]
      pub payer: Signer<'info>,

      /// CHECK: recipient wallet validated off-chain via HMAC intent
      pub recipient: UncheckedAccount<'info>,

      #[account(mut)]
      pub payer_ata: Account<'info, TokenAccount>,

      #[account(mut)]
      pub recipient_ata: Account<'info, TokenAccount>,

      #[account(
          init_if_needed,
          payer = payer,
          space = NonceRecord::LEN,
          seeds = [b"nonce", params.intent_id.as_bytes()],
          bump,
      )]
      pub nonce_record: Account<'info, NonceRecord>,

      #[account(
          init,
          payer = payer,
          space = PaymentRecord::LEN,
          seeds = [b"payment", params.intent_id.as_bytes()],
          bump,
      )]
      pub payment_record: Account<'info, PaymentRecord>,

      pub token_program:  Program<'info, Token>,
      pub system_program: Program<'info, System>,
  }

  // ─── State ────────────────────────────────────────────────────────────────────

  #[account]
  pub struct NonceRecord {
      pub used:       bool,
      pub intent_id:  [u8; 36],
      pub settled_at: i64,
  }
  impl NonceRecord { pub const LEN: usize = 8 + 1 + 36 + 8; }

  #[account]
  pub struct PaymentRecord {
      pub intent_id:       [u8; 36],
      pub payer:           Pubkey,
      pub recipient:       Pubkey,
      pub amount_lamports: u64,
      pub rail:            PaymentRail,
      pub settled_at:      i64,
      pub agent_id_hash:   [u8; 32],
      pub capability_hash: [u8; 32],
  }
  impl PaymentRecord {
      pub const LEN: usize = 8 + 36 + 32 + 32 + 8 + 1 + 8 + 32 + 32;
  }

  // ─── Types ────────────────────────────────────────────────────────────────────

  #[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
  pub enum PaymentRail { Sol, Spl }

  #[derive(AnchorSerialize, AnchorDeserialize, Clone)]
  pub struct SettleParams {
      pub intent_id:       [u8; 36],
      pub amount_lamports: u64,
      pub expires_at:      i64,
      pub agent_id_hash:   [u8; 32],
      pub capability_hash: [u8; 32],
  }

  // ─── Events ───────────────────────────────────────────────────────────────────

  #[event]
  pub struct PaymentSettled {
      pub intent_id:       [u8; 36],
      pub payer:           Pubkey,
      pub recipient:       Pubkey,
      pub amount_lamports: u64,
      pub rail:            PaymentRail,
      pub settled_at:      i64,
  }

  // ─── Errors ───────────────────────────────────────────────────────────────────

  #[error_code]
  pub enum AeeronError {
      #[msg("Payment amount must be greater than zero")]
      ZeroAmount,
      #[msg("Intent nonce has already been used")]
      NonceAlreadyUsed,
      #[msg("Intent has expired")]
      IntentExpired,
  }
  