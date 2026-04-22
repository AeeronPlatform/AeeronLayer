# Aeeron x402 Protocol Specification

**Version:** 1.0  
**Network:** Solana Mainnet-Beta / Devnet  
**Status:** Draft

---

## Abstract

Aeeron implements the x402 payment protocol on Solana, enabling non-custodial, trustless HTTP payments between autonomous agents. The protocol uses the HTTP 402 Payment Required status code as a machine-readable payment demand, with Solana as the settlement layer.

---

## 1. Motivation

The emerging agent-to-agent economy requires a payment primitive that:

- Works natively in HTTP without SDKs on the server side
- Settles instantly with sub-cent fees
- Is non-custodial — funds go directly from payer to payee
- Is replay-resistant and cryptographically verifiable
- Supports both SOL and SPL tokens (USDC)

Aeeron provides this primitive on Solana, extending x402 with on-chain nonce registries, payment channels, and settlement receipts.

---

## 2. Protocol Flow

```
Payer Agent                             Resource Server
    │                                          │
    │──── GET /resource ──────────────────────►│
    │                                          │
    │◄─── 402 Payment Required ────────────────│
    │     X-Payment-Details: base64(JSON)      │
    │     X-Payment-Version: 1                 │
    │     X-Payment-Network: mainnet-beta      │
    │                                          │
    │  [decode details]                        │
    │  [build Solana tx]                       │
    │  [submit tx → get txHash]                │
    │  [sign proof message]                    │
    │                                          │
    │──── GET /resource ──────────────────────►│
    │     X-Payment-Proof: base64(JSON)        │
    │                                          │
    │                        [verify proof]    │
    │                        [check on-chain]  │
    │                                          │
    │◄─── 200 OK ─────────────────────────────│
    │     [resource payload]                   │
```

---

## 3. Headers

### 3.1 X-Payment-Details (Server → Client, 402 Response)

```
X-Payment-Details: <base64-encoded JSON>
X-Payment-Version: 1
X-Payment-Network: mainnet-beta | devnet | localnet
```

**Decoded JSON schema:**

```json
{
  "payee":   "SolanaAddress44chars...",
  "amount":  1000000,
  "token":   "SOL",
  "nonce":   "32-byte-hex-string-64-chars",
  "expiry":  1735689600,
  "network": "mainnet-beta",
  "version": 1
}
```

| Field | Type | Description |
|---|---|---|
| `payee` | string (base58) | Recipient's Solana wallet address |
| `amount` | integer | Payment amount in lamports (SOL) or base units (SPL) |
| `token` | string | `"SOL"` or SPL mint address |
| `nonce` | string (hex, 64 chars) | 32-byte unique nonce preventing replay |
| `expiry` | integer | Unix timestamp — proof must be submitted before this |
| `network` | string | Solana cluster identifier |
| `version` | integer | Protocol version (currently `1`) |

### 3.2 X-Payment-Proof (Client → Server, Retry Request)

```
X-Payment-Proof: <base64-encoded JSON>
X-Payment-Version: 1
```

**Decoded JSON schema:**

```json
{
  "signature": "base58-Ed25519-signature",
  "txHash":    "base58-Solana-transaction-signature",
  "nonce":     "same-nonce-from-payment-details",
  "timestamp": 1735689300
}
```

| Field | Type | Description |
|---|---|---|
| `signature` | string (base58) | Ed25519 signature over the canonical proof message |
| `txHash` | string (base58) | Confirmed Solana transaction signature |
| `nonce` | string (hex, 64 chars) | Must match the nonce in the 402 details |
| `timestamp` | integer | Unix timestamp when the proof was created |

---

## 4. Canonical Proof Message

The `signature` field is an Ed25519 signature by the **payer** over:

```
AEERON_PROOF_V1: || payer(32B) || payee(32B) || amount(8B LE) || nonce(32B) || expiry(8B LE)
```

- All multibyte integers are **little-endian**.
- `payer` and `payee` are raw 32-byte public keys (decoded from base58).
- `nonce` is the raw 32-byte nonce (decoded from hex).

---

## 5. On-Chain Settlement

The Solana transaction must call either:

- `aeeron_protocol::direct_pay` — atomic pay-per-request
- `aeeron_protocol::settle_payment` — settle against an open channel

Both instructions register the nonce in a PDA to prevent replay attacks.

**Nonce PDA derivation:**
```
seeds = ["nonce", nonce_bytes_32]
program = AEERON_PROGRAM_ID
```

**Channel PDA derivation:**
```
seeds = ["channel", payer_pubkey_32, payee_pubkey_32]
program = AEERON_PROGRAM_ID
```

---

## 6. Server Verification Steps

A compliant resource server MUST:

1. Decode the `X-Payment-Proof` header
2. Verify `proof.timestamp > now - 600` (reject stale proofs)
3. Verify `proof.nonce` matches the nonce issued in the 402 response
4. Verify the Ed25519 `proof.signature` over the canonical message
5. Confirm `proof.txHash` is a finalized Solana transaction
6. Verify the nonce PDA exists on-chain (proves the instruction ran)
7. Optionally: emit a receipt via `aeeron_protocol::emit_receipt`

---

## 7. Payment Channels

For high-frequency agent interactions, channels reduce per-request on-chain overhead.

**Lifecycle:**
1. Payer calls `open_channel` — deposits collateral into a program-owned vault
2. Payee claims payments via `settle_payment` — each call verifies the nonce and transfers lamports
3. Payer calls `close_channel` — returns unspent collateral

**Channel invariants:**
- `settled + available == balance` always
- `sequence` increments monotonically with every settlement
- Nonces are registered on-chain to prevent double-spend

---

## 8. Security Considerations

### Replay Attacks
Each nonce is registered on-chain as a PDA. A second use of the same nonce will fail with `NonceAlreadyUsed` at the Solana instruction level.

### Proof Forgery
The canonical proof message includes the payer's public key. A server verifying the Ed25519 signature cryptographically binds the proof to the payer's wallet.

### Amount Manipulation
The amount is included in the signed canonical message. Tampering with the amount invalidates the signature.

### Expired Proofs
The `expiry` field is enforced both by the server (timestamp check) and on-chain (Sysvar::Clock comparison).

---

## 9. Token Support

| Token | Identifier | Decimals |
|---|---|---|
| SOL (native) | `"SOL"` | 9 |
| USDC | `"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"` | 6 |

SPL token channels use `anchor-spl::token::transfer` with associated token accounts derived from the channel vault.

---

## 10. Error Codes

| HTTP Status | Code | Description |
|---|---|---|
| 402 | `PAYMENT_REQUIRED` | No proof provided |
| 402 | `INVALID_PROOF` | Proof failed signature verification |
| 402 | `NONCE_USED` | Nonce already registered on-chain |
| 402 | `PROOF_EXPIRED` | Proof timestamp or expiry exceeded |
| 402 | `TX_NOT_FOUND` | Transaction not found on-chain |
| 402 | `AMOUNT_MISMATCH` | Transaction amount does not match details |

---

## Changelog

| Version | Date | Notes |
|---|---|---|
| 1.0 | 2024-11-01 | Initial specification |
