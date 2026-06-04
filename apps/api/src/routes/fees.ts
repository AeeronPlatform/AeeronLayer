import { Router } from 'express';
  import { z } from 'zod';
  import { validateQuery } from '../middleware/validateQuery';
  import { simulateDirectPay, simulateChannel, simulateComparison } from '@aeeron/protocol';

  export const feesRouter = Router();

  const SimulateQuery = z.object({
    pricePerCallLamports: z.string().regex(/^\d+$/).transform(BigInt),
    calls:                z.string().regex(/^\d+$/).transform(Number),
    mode:                 z.enum(['direct', 'channel', 'both']).optional().default('both'),
  });

  /**
   * GET /v1/fees/simulate
   *
   * Returns a cost breakdown for the given price-per-call and call count.
   *
   * Query params:
   *   pricePerCallLamports  integer (lamports)
   *   calls                 integer
   *   mode                  "direct" | "channel" | "both" (default: "both")
   */
  feesRouter.get('/simulate', validateQuery(SimulateQuery), (req, res) => {
    const { pricePerCallLamports, calls, mode } = req.query as unknown as z.infer<typeof SimulateQuery>;

    if (mode === 'direct') {
      return res.json(simulateDirectPay(pricePerCallLamports, calls));
    }
    if (mode === 'channel') {
      return res.json(simulateChannel(pricePerCallLamports, calls));
    }

    // 'both'
    const result = simulateComparison(pricePerCallLamports, calls);
    // Serialize bigints to strings for JSON transport
    return res.json(JSON.parse(JSON.stringify(result, (_k, v) =>
      typeof v === 'bigint' ? v.toString() : v
    )));
  });
  