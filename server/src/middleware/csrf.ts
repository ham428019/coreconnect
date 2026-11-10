import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

const COOKIE_NAME = 'csrfToken';
const MAX_AGE = 24 * 60 * 60 * 1000;
const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

function signature(nonce: string): string {
  return crypto.createHmac('sha256', env.JWT_REFRESH_SECRET).update('csrf:' + nonce).digest('hex');
}

function validToken(token: unknown): token is string {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(token)) return false;
  const [nonce, mac] = token.split('.');
  return crypto.timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(signature(nonce), 'hex'));
}

export function issueCsrfToken(_req: Request, res: Response): void {
  const nonce = crypto.randomBytes(32).toString('hex');
  const csrfToken = nonce + '.' + signature(nonce);
  res.cookie(COOKIE_NAME, csrfToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
  res.setHeader('Cache-Control', 'no-store');
  res.json({ success: true, data: { csrfToken } });
}

export function requireCsrf(req: Request, res: Response, next: NextFunction): void {
  if (safeMethods.has(req.method)) return next();
  const cookieToken = req.cookies?.[COOKIE_NAME];
  const headerToken = req.get('X-CSRF-Token');
  if (!validToken(cookieToken) || !validToken(headerToken) ||
      !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    res.status(403).json({ success: false, message: 'Invalid or missing CSRF token' });
    return;
  }
  next();
}
