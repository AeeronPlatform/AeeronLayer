import express from 'express';
  import { pinoHttp } from 'pino-http';
  import { logger } from './logger';
  import { rateLimiter, walletRateLimiter } from './middleware/rateLimiter';
  import { requestLogger } from './middleware/requestLogger';
  import { paymentsRouter }  from './routes/payments';
  import { channelsRouter }  from './routes/channels';
  import { proofRouter }     from './routes/proof';
  import { acceptRouter }    from './routes/accept';
  import { webhooksRouter }  from './routes/webhooks';
  import { agentsRouter }    from './routes/agents';
  import { sessionsRouter }  from './routes/sessions';

  export const app = express();

  app.use(express.json());
  app.use(pinoHttp({ logger }));
  app.use(requestLogger());

  // Global rate limit: 120 req/min per IP
  app.use(rateLimiter({ max: 120, windowMs: 60_000 }));

  app.get('/healthz', (_req, res) => res.json({ ok: true }));

  // Tighter limits on payment-sensitive routes
  app.use('/v1/payments', walletRateLimiter({ max: 30 }), paymentsRouter);
  app.use('/v1/channels', walletRateLimiter({ max: 20 }), channelsRouter);
  app.use('/v1/proof',    walletRateLimiter({ max: 60 }), proofRouter);
  app.use('/v1/accept',   walletRateLimiter({ max: 60 }), acceptRouter);
  app.use('/v1/webhooks', rateLimiter({ max: 30 }),        webhooksRouter);
  app.use('/v1/agents',   rateLimiter({ max: 60 }),        agentsRouter);
  app.use('/v1/sessions', walletRateLimiter({ max: 60 }),  sessionsRouter);
  