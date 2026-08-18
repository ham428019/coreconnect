import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { apiResponse, apiError, getPagination, buildMeta } from '../../utils/helpers';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/product/:productId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { productId: req.params.productId as string },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      }),
      prisma.review.count({ where: { productId: req.params.productId as string } }),
    ]);
    apiResponse(res, { reviews }, undefined, buildMeta(page, limit, total));
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, rating, title, comment } = req.body;

    const existing = await prisma.review.findFirst({
      where: { userId: req.user!.userId, productId },
    });
    if (existing) return apiError(res, 400, 'You have already reviewed this product');

    const review = await prisma.review.create({
      data: {
        userId: req.user!.userId,
        productId,
        rating,
        title,
        comment,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });

    apiResponse(res, { review }, 'Review submitted');
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const review = await prisma.review.findFirst({
      where: { id: req.params.id as string, userId: req.user!.userId },
    });
    if (!review) return apiError(res, 404, 'Review not found');
    await prisma.review.delete({ where: { id: req.params.id as string } });
    apiResponse(res, null, 'Review deleted');
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/:id', requireAuth, requireRole(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const review = await prisma.review.update({
      where: { id: req.params.id as string },
      data: req.body,
    });
    apiResponse(res, { review }, 'Review updated');
  } catch (error) {
    next(error);
  }
});

export default router;
