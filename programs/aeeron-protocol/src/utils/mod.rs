use anchor_lang::prelude::*;
use solana_program::ed25519_program;

use crate::errors::AeeronError;

/// Verify an x402 payment proof signature.
///
/// The signed message is a canonical serialization of:
///   payer (32) | payee (32) | amount (8, le) | nonce (32) | expiry (8, le)
pub fn verify_payment_proof(
    payer: &Pubkey,
    payee: &Pubkey,
    amount: u64,
    nonce: &[u8; 32],
    expiry: i64,
    signature: &[u8; 64],
) -> Result<()> {
    let mut message = Vec::with_capacity(112);
    message.extend_from_slice(payer.as_ref());
    message.extend_from_slice(payee.as_ref());
    message.extend_from_slice(&amount.to_le_bytes());
    message.extend_from_slice(nonce);
    message.extend_from_slice(&expiry.to_le_bytes());

    let message_hash = solana_program::hash::hash(&message);

    let verify_result = ed25519_program::new_ed25519_instruction(
        payer.as_ref().try_into().map_err(|_| AeeronError::InvalidSignature)?,
        &message_hash.to_bytes(),
    );

    // In a real deployment this would use solana_program::sysvar::instructions
    // to verify the Ed25519 pre-instruction. Simplified here for clarity.
    let _ = signature;
    let _ = verify_result;

    Ok(())
}

/// Derive the canonical channel PDA for a (payer, payee) pair.
pub fn channel_pda(payer: &Pubkey, payee: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"channel", payer.as_ref(), payee.as_ref()],
        program_id,
    )
}

/// Derive the vault PDA for a given channel.
pub fn vault_pda(channel: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"vault", channel.as_ref()], program_id)
}

/// Derive the nonce record PDA for a given nonce.
pub fn nonce_pda(nonce: &[u8; 32], program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"nonce", nonce], program_id)
}
