import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { apiResponse, apiError } from '../../utils/helpers';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.query.code as string;
    if (!code) return apiError(res, 400, 'Coupon code required');

    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.isActive) return apiError(res, 404, 'Invalid coupon');
    if (coupon.expiresAt && new Date() > coupon.expiresAt) return apiError(res, 400, 'Coupon expired');
    if (coupon.startsAt && new Date() < coupon.startsAt) return apiError(res, 400, 'Coupon not yet active');
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) return apiError(res, 400, 'Coupon usage limit reached');

    apiResponse(res, {
      coupon: {
        ...coupon,
        discountValue: Number(coupon.discountValue),
        minOrderAmount: coupon.minOrderAmount ? Number(coupon.minOrderAmount) : null,
        maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', requireAuth, requireRole(UserRole.MANAGER, UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    apiResponse(res, { coupons: coupons.map(c => ({ ...c, discountValue: Number(c.discountValue) })) });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, requireRole(UserRole.MANAGER, UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, discountType, discountValue, minOrderAmount, usageLimit } = req.body;
    const coupon = await prisma.coupon.create({
      data: {
        code,
        discountType,
        discountValue,
        minOrderAmount,
        usageLimit,
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        applicableCategories: [],
      },
    });
    apiResponse(res, { coupon }, 'Coupon created');
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAuth, requireRole(UserRole.MANAGER, UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id as string } });
    apiResponse(res, null, 'Coupon deleted');
  } catch (error) {
    next(error);
  }
});

export default router;
