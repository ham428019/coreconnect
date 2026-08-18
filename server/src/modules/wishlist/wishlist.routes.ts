import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { requireAuth } from '../../middleware/requireAuth';
import { apiResponse, apiError } from '../../utils/helpers';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.user!.userId },
      include: {
        product: {
          include: {
            category: true,
            brand: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    apiResponse(res, {
      items: items.map(i => ({
        ...i,
        product: { ...i.product, price: Number(i.product.price) },
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.body;
    const existing = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId: req.user!.userId, productId } },
    });
    if (existing) return apiError(res, 400, 'Product already in wishlist');

    const item = await prisma.wishlistItem.create({
      data: { userId: req.user!.userId, productId },
    });
    apiResponse(res, { item }, 'Added to wishlist');
  } catch (error) {
    next(error);
  }
});

router.delete('/:productId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.wishlistItem.deleteMany({
      where: { userId: req.user!.userId, productId: req.params.productId as string },
    });
    apiResponse(res, null, 'Removed from wishlist');
  } catch (error) {
    next(error);
  }
});

export default router;
