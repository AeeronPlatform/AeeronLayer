import { type Request, type Response, type NextFunction } from 'express';
  import { Connection, PublicKey }  from '@solana/web3.js';
  import { getAssociatedTokenAddressSync } from '@solana/spl-token';
  import { AEERON_MINT }            from '@aeeron/protocol';
  import { logger }                 from '../logger';

  const MINT_PUBKEY  = new PublicKey(AEERON_MINT);
  const connection   = new Connection(
    process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com',
    'confirmed',
  );

  // Cache ATA balances for 60s to avoid hammering RPC on every request
  const balanceCache = new Map<string, { balance: bigint; expiresAt: number }>();
  const CACHE_TTL_MS = 60_000;

  async function getAeeronBalance(walletPubkey: string): Promise<bigint> {
    const cached = balanceCache.get(walletPubkey);
    if (cached && Date.now() < cached.expiresAt) return cached.balance;

    try {
      const wallet = new PublicKey(walletPubkey);
      const ata    = getAssociatedTokenAddressSync(MINT_PUBKEY, wallet);
      const info   = await connection.getTokenAccountBalance(ata, 'confirmed');
      const balance = BigInt(info.value.amount);
      balanceCache.set(walletPubkey, { balance, expiresAt: Date.now() + CACHE_TTL_MS });
      return balance;
    } catch {
      // ATA doesn't exist → zero balance
      balanceCache.set(walletPubkey, { balance: 0n, expiresAt: Date.now() + CACHE_TTL_MS });
      return 0n;
    }
  }

  export interface TokenGateOptions {
    /** Minimum $AEERON balance required (in raw units, 6 decimals). Default: 1_000_000 = 1 AEERON */
    minBalance?: bigint;
    /** Header name containing the payer wallet public key. Default: x-aeeron-wallet */
    walletHeader?: string;
  }

  /**
   * tokenGate
   *
   * Express middleware that enforces a minimum $AEERON token balance before
   * allowing access to a route. Agents that haven't acquired enough $AEERON
   * are rejected with HTTP 403 before any compute or settlement occurs.
   *
   * Usage:
   *   router.post('/premium', tokenGate({ minBalance: 10_000_000n }), handler);
   *
   * The wallet public key is read from the X-Aeeron-Wallet header (set by the
   * agent SDK). Balance is cached per wallet for 60s to minimise RPC calls.
   */
  export function tokenGate(opts: TokenGateOptions = {}) {
    const minBalance  = opts.minBalance  ?? 1_000_000n;   // 1 AEERON
    const walletHeader = opts.walletHeader ?? 'x-aeeron-wallet';

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const wallet = req.headers[walletHeader];
      if (!wallet || typeof wallet !== 'string') {
        res.status(401).json({
          error: `Missing ${walletHeader} header`,
          code:  'WALLET_HEADER_MISSING',
        });
        return;
      }

      let pubkey: PublicKey;
      try {
        pubkey = new PublicKey(wallet);
      } catch {
        res.status(400).json({ error: 'Invalid wallet public key', code: 'WALLET_INVALID' });
        return;
      }

      let balance: bigint;
      try {
        balance = await getAeeronBalance(pubkey.toBase58());
      } catch (err) {
        logger.warn({ err, wallet }, 'tokenGate: RPC error checking balance');
        res.status(503).json({ error: 'Unable to verify $AEERON balance', code: 'RPC_ERROR' });
        return;
      }

      if (balance < minBalance) {
        const humanMin     = (Number(minBalance)  / 1e6).toFixed(2);
        const humanBalance = (Number(balance)     / 1e6).toFixed(2);
        logger.info({ wallet, balance: humanBalance, required: humanMin }, 'tokenGate: rejected');
        res.status(403).json({
          error:    `Insufficient $AEERON balance. Required: ${humanMin}, held: ${humanBalance}`,
          code:     'INSUFFICIENT_AEERON',
          required: minBalance.toString(),
          held:     balance.toString(),
          mint:     AEERON_MINT,
        });
        return;
      }

      // Attach balance to request for downstream handlers
      (req as Request & { aeeronBalance: bigint }).aeeronBalance = balance;
      next();
    };
  }
  