import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRole } from '@prisma/client';
import { prisma } from '../config/database';

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true, email: true, role: true, isActive: true } });
    if (!user || !user.isActive) { res.status(401).json({ success: false, message: 'Account unavailable' }); return; }
    req.user = { userId: user.id, email: user.email, role: user.role };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
      req.user = payload;
    } catch {}
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export const MANAGER_PERMISSIONS = ['products.create', 'products.edit', 'products.delete', 'inventory.update', 'orders.view', 'orders.update', 'coupons.manage', 'analytics.view'] as const;
export type ManagerPermission = typeof MANAGER_PERMISSIONS[number];

export function requirePermission(permission: ManagerPermission, employeeAllowed = false) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) { res.status(401).json({ success: false, message: 'Authentication required' }); return; }
      if (req.user.role === UserRole.ADMIN || (employeeAllowed && req.user.role === UserRole.EMPLOYEE)) { next(); return; }
      if (req.user.role !== UserRole.MANAGER) { res.status(403).json({ success: false, message: 'Insufficient permissions' }); return; }
      const manager = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { managerPermissions: true, isActive: true, role: true } });
      if (!manager?.isActive || manager.role !== UserRole.MANAGER || !manager.managerPermissions.includes(permission)) { res.status(403).json({ success: false, message: 'Permission not granted by Admin' }); return; }
      next();
    } catch (error) { next(error); }
  };
}
