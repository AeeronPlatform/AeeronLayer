import type { Request, Response, NextFunction } from 'express';

  interface RateLimitOptions {
    /** Rolling window in ms (default: 60_000 = 1 min). */
    windowMs?: number;
    /** Max requests per window per key (default: 60). */
    max?: number;
    /** Key extractor — defaults to IP address. */
    keyFn?: (req: Request) => string;
    /** Custom message (default: standard 429 JSON). */
    message?: string;
  }

  interface BucketEntry {
    count:   number;
    resetAt: number;
  }

  /**
   * rateLimiter
   *
   * Sliding-window rate limiter backed by an in-process Map.
   * For multi-instance deployments, replace the Map with a Redis INCR/EXPIRE pair.
   *
   * Returns X-RateLimit-* headers on every response so clients can back off.
   *
   *   app.use('/v1/payments', rateLimiter({ max: 30, windowMs: 60_000 }));
   */
  export function rateLimiter(opts: RateLimitOptions = {}) {
    const windowMs = opts.windowMs ?? 60_000;
    const max      = opts.max      ?? 60;
    const keyFn    = opts.keyFn    ?? ((req) => req.ip ?? 'unknown');
    const message  = opts.message  ?? 'Too many requests — please slow down.';

    const buckets = new Map<string, BucketEntry>();

    // Prune expired buckets every window to prevent memory leaks
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of buckets) {
        if (now >= entry.resetAt) buckets.delete(key);
      }
    }, windowMs);

    return (req: Request, res: Response, next: NextFunction) => {
      const key = keyFn(req);
      const now = Date.now();

      let entry = buckets.get(key);
      if (!entry || now >= entry.resetAt) {
        entry = { count: 0, resetAt: now + windowMs };
        buckets.set(key, entry);
      }

      entry.count++;
      const remaining = Math.max(0, max - entry.count);
      const resetSecs = Math.ceil((entry.resetAt - now) / 1000);

      res.setHeader('X-RateLimit-Limit',     max);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset',     resetSecs);

      if (entry.count > max) {
        res.setHeader('Retry-After', resetSecs);
        return res.status(429).json({ error: message, retryAfterSeconds: resetSecs });
      }

      next();
    };
  }

  /**
   * walletRateLimiter
   *
   * Convenience wrapper that keys by the `x-payer-wallet` header,
   * falling back to IP. Use on payment-sensitive routes.
   */
  export function walletRateLimiter(opts: RateLimitOptions = {}) {
    return rateLimiter({
      ...opts,
      keyFn: (req) =>
        (req.headers['x-payer-wallet'] as string | undefined) ?? req.ip ?? 'unknown',
    });
  }
  