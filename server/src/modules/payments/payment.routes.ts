import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { apiResponse, apiError } from '../../utils/helpers';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/methods', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      methods: [
        { id: 'COD', name: 'Cash on Delivery', fee: 5.00, description: 'Pay when your order arrives' },
        { id: 'BANK_TRANSFER', name: 'Bank Transfer', fee: 0, description: 'Transfer directly to our bank account' },
      ],
    },
  });
});

router.post('/verify', requireAuth, requireRole(UserRole.ADMIN, UserRole.MANAGER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId, referenceCode, notes } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) return apiError(res, 404, 'Order not found');

    await prisma.paymentTransaction.updateMany({
      where: { orderId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        referenceCode: referenceCode || undefined,
        notes: notes || undefined,
        verifiedBy: req.user!.userId,
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'COMPLETED', status: 'CONFIRMED' },
    });

    apiResponse(res, null, 'Payment verified successfully');
  } catch (error) {
    next(error);
  }
});

export default router;
