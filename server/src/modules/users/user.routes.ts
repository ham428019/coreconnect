import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { requireAuth, requireRole, MANAGER_PERMISSIONS } from '../../middleware/requireAuth';
import { apiResponse, apiError, getPagination, buildMeta } from '../../utils/helpers';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const router = Router();

router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { addresses: true },
    });
    if (!user) return apiError(res, 404, 'User not found');
    const { passwordHash: _, ...safe } = user;
    apiResponse(res, { user: safe });
  } catch (error) {
    next(error);
  }
});

router.patch('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, phone, avatarUrl } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { firstName, lastName, phone, avatarUrl },
    });
    const { passwordHash: _, ...safe } = user;
    apiResponse(res, { user: safe }, 'Profile updated');
  } catch (error) {
    next(error);
  }
});

router.patch('/me/password', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) return apiError(res, 404, 'User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return apiError(res, 400, 'Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    apiResponse(res, null, 'Password changed');
  } catch (error) {
    next(error);
  }
});

router.get('/me/addresses', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const addresses = await prisma.address.findMany({ where: { userId: req.user!.userId } });
    apiResponse(res, { addresses });
  } catch (error) {
    next(error);
  }
});

router.post('/me/addresses', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { label, street, city, state, zipCode, country, isDefault } = req.body;
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.userId },
        data: { isDefault: false },
      });
    }
    const address = await prisma.address.create({
      data: {
        userId: req.user!.userId,
        label, street, city, state, zipCode, country: country || 'US', isDefault: isDefault || false,
      },
    });
    apiResponse(res, { address }, 'Address added');
  } catch (error) {
    next(error);
  }
});

router.patch('/me/addresses/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const address = await prisma.address.findFirst({
      where: { id: req.params.id as string, userId: req.user!.userId },
    });
    if (!address) return apiError(res, 404, 'Address not found');

    if (req.body.isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.userId },
        data: { isDefault: false },
      });
    }
    const updated = await prisma.address.update({
      where: { id: req.params.id as string },
      data: req.body,
    });
    apiResponse(res, { address: updated }, 'Address updated');
  } catch (error) {
    next(error);
  }
});

router.delete('/me/addresses/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.address.deleteMany({
      where: { id: req.params.id as string, userId: req.user!.userId },
    });
    apiResponse(res, null, 'Address deleted');
  } catch (error) {
    next(error);
  }
});

router.get('/admin/users', requireAuth, requireRole(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, managerPermissions: true, isActive: true, createdAt: true },
      }),
      prisma.user.count(),
    ]);
    apiResponse(res, { users }, undefined, buildMeta(page, limit, total));
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/users/:id/role', requireAuth, requireRole(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.body;
    if (!Object.values(UserRole).includes(role)) return apiError(res, 400, 'Invalid role');
    if (req.params.id === req.user!.userId) return apiError(res, 400, 'Cannot change your own role');
    const user = await prisma.user.update({
      where: { id: req.params.id as string },
      data: { role, managerPermissions: [] },
    });
    const { passwordHash: _, ...safe } = user;
    apiResponse(res, { user: safe }, 'Role updated');
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/users/:id/deactivate', requireAuth, requireRole(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.params.id === req.user!.userId) return apiError(res, 400, 'Cannot deactivate your own account');
    const user = await prisma.user.update({
      where: { id: req.params.id as string },
      data: { isActive: false },
    });
    apiResponse(res, null, 'User deactivated');
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/users/:id/permissions', requireAuth, requireRole(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const permissions = req.body?.permissions;
    if (!Array.isArray(permissions) || !permissions.every((p: unknown) => typeof p === 'string' && (MANAGER_PERMISSIONS as readonly string[]).includes(p))) return apiError(res, 400, 'Invalid permissions');
    const target = await prisma.user.findUnique({ where: { id: req.params.id as string } });
    if (!target || target.role !== UserRole.MANAGER) return apiError(res, 400, 'Target must be a Manager');
    const updated = await prisma.user.update({ where: { id: target.id }, data: { managerPermissions: [...new Set(permissions)] } });
    await prisma.activityLog.create({ data: { userId: req.user!.userId, action: 'MANAGER_PERMISSIONS_UPDATED', entityType: 'User', entityId: target.id, details: { before: target.managerPermissions, after: updated.managerPermissions } } });
    apiResponse(res, { permissions: updated.managerPermissions }, 'Manager permissions updated');
  } catch (error) { next(error); }
});

export default router;
