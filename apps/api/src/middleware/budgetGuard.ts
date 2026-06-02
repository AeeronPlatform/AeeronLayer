import type { Request, Response, NextFunction } from 'express';

  /**
   * budgetGuard
   *
   * Middleware factory that rejects requests if a session's spend exceeds
   * the caller's configured budget. Attach before any route that calls
   * session.recordCall().
   *
   *   router.post('/infer', budgetGuard({ maxLamports: 1_000_000n }), handler);
   */
  export function budgetGuard(opts: { maxLamports: bigint }) {
    return (req: Request, res: Response, next: NextFunction) => {
      const spent = req.headers['x-session-spent-lamports'];
      if (!spent) return next();

      try {
        if (BigInt(spent as string) >= opts.maxLamports) {
          return res.status(402).json({
            error: 'session budget exceeded',
            code:  'BUDGET_EXCEEDED',
            maxLamports: opts.maxLamports.toString(),
            spentLamports: spent,
          });
        }
      } catch {
        // malformed header — let downstream handle it
      }
      next();
    };
  }
  