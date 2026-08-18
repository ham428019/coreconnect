import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { requireAuth } from '../../middleware/requireAuth';
import { apiResponse, apiError } from '../../utils/helpers';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.cartItem.findMany({
      where: { userId: req.user!.userId },
      include: {
        product: {
          include: {
            category: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const summary = items.reduce((acc, item) => ({
      subtotal: acc.subtotal + Number(item.product.price) * item.quantity,
      itemCount: acc.itemCount + item.quantity,
    }), { subtotal: 0, itemCount: 0 });

    apiResponse(res, { items: items.map(i => ({ ...i, product: { ...i.product, price: Number(i.product.price) } })), summary });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, variantId, quantity } = req.body;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return apiError(res, 404, 'Product not found');
    if (!product.isActive) return apiError(res, 400, 'Product is not available');

    const existing = await prisma.cartItem.findFirst({
      where: { userId: req.user!.userId, productId, variantId: variantId || null },
    });

    let cartItem;
    if (existing) {
      cartItem = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + (quantity || 1) },
        include: { product: true },
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: {
          userId: req.user!.userId,
          productId,
          variantId,
          quantity: quantity || 1,
        },
        include: { product: true },
      });
    }

    apiResponse(res, { cartItem: { ...cartItem, product: { ...cartItem.product, price: Number(cartItem.product.price) } } }, 'Added to cart');
  } catch (error) {
    next(error);
  }
});

router.patch('/:itemId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { quantity } = req.body;
    const cartItem = await prisma.cartItem.findFirst({
      where: { id: req.params.itemId as string, userId: req.user!.userId },
    });
    if (!cartItem) return apiError(res, 404, 'Cart item not found');

    if (quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: cartItem.id } });
      return apiResponse(res, null, 'Item removed from cart');
    }

    const updated = await prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity },
      include: { product: true },
    });

    apiResponse(res, { cartItem: { ...updated, product: { ...updated.product, price: Number(updated.product.price) } } }, 'Cart updated');
  } catch (error) {
    next(error);
  }
});

router.delete('/:itemId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.cartItem.deleteMany({
      where: { id: req.params.itemId as string, userId: req.user!.userId },
    });
    apiResponse(res, null, 'Item removed from cart');
  } catch (error) {
    next(error);
  }
});

router.delete('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.cartItem.deleteMany({ where: { userId: req.user!.userId } });
    apiResponse(res, null, 'Cart cleared');
  } catch (error) {
    next(error);
  }
});

export default router;
