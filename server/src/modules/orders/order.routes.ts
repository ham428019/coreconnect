import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { apiResponse, apiError, getPagination, buildMeta } from '../../utils/helpers';
import { UserRole, OrderStatus, PaymentStatus } from '@prisma/client';
import { generateOrderNumber, generateInvoiceNumber } from '../../utils/generateIds';
import { orderConfirmationEmail, sendEmail } from '../../utils/sendEmail';

const router = Router();

router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { addressId, paymentMethod, couponCode } = req.body;

    const address = await prisma.address.findFirst({
      where: { id: addressId, userId: req.user!.userId },
    });
    if (!address) return apiError(res, 404, 'Address not found');

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: req.user!.userId },
      include: { product: true },
    });
    if (cartItems.length === 0) return apiError(res, 400, 'Cart is empty');

    for (const item of cartItems) {
      if (!item.product.isActive) return apiError(res, 400, `Product "${item.product.name}" is not available`);
      if (item.product.stockQty < item.quantity) {
        return apiError(res, 400, `Insufficient stock for "${item.product.name}" (${item.product.stockQty} available)`);
      }
      if (item.product.isDigital && paymentMethod === 'COD') {
        return apiError(res, 400, `Cash on Delivery is not available for digital products`);
      }
    }

    let discountAmount = 0;
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
      if (!coupon || !coupon.isActive) return apiError(res, 400, 'Invalid coupon code');
      if (coupon.expiresAt && new Date() > coupon.expiresAt) return apiError(res, 400, 'Coupon has expired');
      if (new Date() < coupon.startsAt) return apiError(res, 400, 'Coupon not yet active');
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) return apiError(res, 400, 'Coupon usage limit reached');

      const subtotal = cartItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
      if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
        return apiError(res, 400, `Minimum order amount of $${coupon.minOrderAmount} required`);
      }

      if (coupon.discountType === 'PERCENTAGE') {
        discountAmount = subtotal * (Number(coupon.discountValue) / 100);
        if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
      } else if (coupon.discountType === 'FIXED_AMOUNT') {
        discountAmount = Number(coupon.discountValue);
      } else if (coupon.discountType === 'FREE_SHIPPING') {
        discountAmount = 0;
      }

      await prisma.coupon.update({ where: { id: coupon.id }, data: { usageCount: { increment: 1 } } });
    }

    const subtotal = cartItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
    const shippingCost = paymentMethod === 'COD' ? 5.00 : 0;
    const taxAmount = subtotal * 0.08;
    const totalAmount = subtotal + shippingCost + taxAmount - discountAmount;

    const orderNumber = generateOrderNumber();

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: req.user!.userId,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: paymentMethod || 'COD',
        subtotal,
        shippingCost,
        taxAmount,
        discountAmount,
        totalAmount,
        shippingAddress: {
          label: address.label,
          street: address.street,
          city: address.city,
          state: address.state,
          zipCode: address.zipCode,
          country: address.country,
        },
        items: {
          create: cartItems.map(item => ({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: item.product.price,
            totalPrice: Number(item.product.price) * item.quantity,
          })),
        },
      },
      include: { items: true },
    });

    await prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        method: paymentMethod || 'COD',
        amount: totalAmount,
        status: 'PENDING',
      },
    });

    for (const item of cartItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stockQty: { decrement: item.quantity } },
      });
    }

    await prisma.cartItem.deleteMany({ where: { userId: req.user!.userId } });

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (user) {
      const itemsHtml = order.items.map(i => `<p>${i.productName} x ${i.quantity} - $${Number(i.totalPrice).toFixed(2)}</p>`).join('');
      const html = orderConfirmationEmail(orderNumber, Number(totalAmount).toFixed(2), itemsHtml);
      await sendEmail(user.email, `Order Confirmed #${orderNumber}`, html);
    }

    apiResponse(res, {
      order: {
        ...order,
        subtotal: Number(order.subtotal),
        shippingCost: Number(order.shippingCost),
        taxAmount: Number(order.taxAmount),
        discountAmount: Number(order.discountAmount),
        totalAmount: Number(order.totalAmount),
      },
    }, 'Order placed successfully');
  } catch (error) {
    next(error);
  }
});

router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId: req.user!.userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true, payment: true },
      }),
      prisma.order.count({ where: { userId: req.user!.userId } }),
    ]);
    const formatted = orders.map(o => ({
      ...o,
      subtotal: Number(o.subtotal),
      shippingCost: Number(o.shippingCost),
      taxAmount: Number(o.taxAmount),
      discountAmount: Number(o.discountAmount),
      totalAmount: Number(o.totalAmount),
    }));
    apiResponse(res, { orders: formatted }, undefined, buildMeta(page, limit, total));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id as string },
      include: { items: { include: { product: { include: { images: true } } } }, payment: true },
    });
    if (!order) return apiError(res, 404, 'Order not found');
    if (order.userId !== req.user!.userId && !['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(req.user!.role)) {
      return apiError(res, 403, 'Access denied');
    }
    apiResponse(res, {
      order: {
        ...order,
        subtotal: Number(order.subtotal),
        shippingCost: Number(order.shippingCost),
        taxAmount: Number(order.taxAmount),
        discountAmount: Number(order.discountAmount),
        totalAmount: Number(order.totalAmount),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/all', requireAuth, requireRole(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { status } = req.query;
    const where: any = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          items: true,
          payment: true,
        },
      }),
      prisma.order.count({ where }),
    ]);
    const formatted = orders.map(o => ({
      ...o,
      subtotal: Number(o.subtotal),
      shippingCost: Number(o.shippingCost),
      taxAmount: Number(o.taxAmount),
      discountAmount: Number(o.discountAmount),
      totalAmount: Number(o.totalAmount),
    }));
    apiResponse(res, { orders: formatted }, undefined, buildMeta(page, limit, total));
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/:id/status', requireAuth, requireRole(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, trackingNumber, carrier } = req.body;
    const updateData: any = { status };

    if (status === 'SHIPPED') {
      updateData.shippedAt = new Date();
      if (trackingNumber) updateData.trackingNumber = trackingNumber;
      if (carrier) updateData.carrier = carrier;
    }
    if (status === 'DELIVERED') updateData.deliveredAt = new Date();

    const order = await prisma.order.update({
      where: { id: req.params.id as string },
      data: updateData,
      include: { items: true, payment: true },
    });

    apiResponse(res, {
      order: {
        ...order,
        subtotal: Number(order.subtotal),
        totalAmount: Number(order.totalAmount),
      },
    }, 'Order status updated');
  } catch (error) {
    next(error);
  }
});

export default router;
