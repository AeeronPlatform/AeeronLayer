import type { Request, Response, NextFunction } from 'express';

  /**
   * requestLogger
   *
   * Structured per-request logging middleware.
   * Logs method, path, status, duration, and payer wallet (if present).
   * Skips /healthz to reduce noise.
   */
  export function requestLogger() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.path === '/healthz') return next();

      const start  = Date.now();
      const wallet = (req.headers['x-payer-wallet'] as string | undefined)?.slice(0, 8);

      res.on('finish', () => {
        const ms = Date.now() - start;
        req.log?.info({
          method:  req.method,
          path:    req.path,
          status:  res.statusCode,
          ms,
          wallet:  wallet ?? null,
          ip:      req.ip,
        });
      });

      next();
    };
  }
  