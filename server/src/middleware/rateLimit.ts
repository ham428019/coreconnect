import { Request, Response, NextFunction } from 'express';

type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

/**
 * Per-process fixed-window limiter. For multi-instance deployments use a shared
 * store such as Redis; this intentionally requires no new dependencies.
 */
export function rateLimit(options: { name: string; windowMs: number; max: number }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = options.name + ':' + (req.ip || req.socket.remoteAddress || 'unknown');
    let entry = buckets.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + options.windowMs };
      buckets.set(key, entry);
    }
    entry.count += 1;
    const remaining = Math.max(0, options.max - entry.count);
    res.setHeader('RateLimit-Limit', String(options.max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil((entry.resetAt - now) / 1000)));
    if (entry.count > options.max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
      return;
    }
    // Opportunistic cleanup to avoid retaining expired IP entries indefinitely.
    if (buckets.size > 10000) {
      for (const [id, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(id);
      }
    }
    next();
  };
}

export const generalApiLimiter = rateLimit({ name: 'api', windowMs: 60_000, max: 100 });
export const signupLimiter = rateLimit({ name: 'signup', windowMs: 60 * 60_000, max: 5 });

export const chatbotLimiter = rateLimit({ name: 'ai-chat', windowMs: 60_000, max: 20 });
export const productSearchLimiter = rateLimit({ name: 'product-search', windowMs: 60_000, max: 60 });
export const imageUploadLimiter = rateLimit({ name: 'image-upload', windowMs: 15 * 60_000, max: 10 });
