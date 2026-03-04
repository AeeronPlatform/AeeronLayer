import type { RequestHandler } from "express";

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 120;

const store = new Map<string, { count: number; resetAt: number }>();

export const rateLimiter: RequestHandler = (req, res, next) => {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ??
    req.socket.remoteAddress ??
    "unknown";

  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  entry.count += 1;

  if (entry.count > MAX_REQUESTS) {
    res.status(429).json({
      error: "Too Many Requests",
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    });
    return;
  }

  next();
};
