import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { apiResponse, apiError } from '../../utils/helpers';
import { UserRole, DiscountType } from '@prisma/client';

const router = Router();

router.get('/active', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    const active = coupons.filter(c => !c.usageLimit || c.usageCount < c.usageLimit);
    apiResponse(res, { coupons: active.map(c => ({
      id: c.id,
      code: c.code,
      description: c.description,
      discountType: c.discountType,
      discountValue: Number(c.discountValue),
      minOrderAmount: c.minOrderAmount ? Number(c.minOrderAmount) : null,
      maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : null,
    })) });
  } catch (error) {
    next(error);
  }
});

router.get('/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = String(req.query.code || '').trim().toUpperCase();
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

    const cleanCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
    if (!cleanCode) return apiError(res, 400, 'Coupon code is required');

    const cleanType = String(discountType || '').toUpperCase();
    if (!['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING'].includes(cleanType)) {
      return apiError(res, 400, 'Invalid discount type');
    }

    const value = Number(discountValue);
    if (!Number.isFinite(value) || value <= 0) return apiError(res, 400, 'A valid discount value is required');

    const cleanMin = minOrderAmount === '' || minOrderAmount === null || minOrderAmount === undefined
      ? null
      : Number(minOrderAmount);
    if (cleanMin !== null && (!Number.isFinite(cleanMin) || cleanMin < 0)) return apiError(res, 400, 'Invalid minimum order amount');

    const cleanLimit = usageLimit === '' || usageLimit === null || usageLimit === undefined
      ? null
      : Number(usageLimit);
    if (cleanLimit !== null && (!Number.isInteger(cleanLimit) || cleanLimit < 0)) return apiError(res, 400, 'Invalid usage limit');

    const coupon = await prisma.coupon.create({
      data: {
        code: cleanCode,
        discountType: cleanType as DiscountType,
        discountValue: value,
        minOrderAmount: cleanMin,
        usageLimit: cleanLimit,
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        applicableCategories: [],
      },
    });
    apiResponse(res, { coupon: { ...coupon, discountValue: Number(coupon.discountValue) } }, 'Coupon created');
  } catch (error: any) {
    if (error?.code === 'P2002') return apiError(res, 400, `Coupon code "${req.body?.code ?? ''}" already exists`);
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
