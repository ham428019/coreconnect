import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { apiResponse } from '../../utils/helpers';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/sales', requireAuth, requireRole(UserRole.MANAGER, UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const totalRevenue = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED'] } },
    });

    const totalOrders = await prisma.order.count({ where: { status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED'] } } });
    const totalUsers = await prisma.user.count();
    const totalProducts = await prisma.product.count();

    const lowStock = await prisma.product.count({ where: { stockQty: { lte: prisma.product.fields.lowStockThreshold } } });

    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    });

    apiResponse(res, {
      kpi: {
        totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
        totalOrders,
        totalUsers,
        totalProducts,
        lowStockProducts: lowStock,
      },
      recentOrders: recentOrders.map(o => ({
        ...o,
        subtotal: Number(o.subtotal),
        totalAmount: Number(o.totalAmount),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/top-products', requireAuth, requireRole(UserRole.MANAGER, UserRole.ADMIN), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        _count: { select: { orderItems: true } },
        images: { where: { isPrimary: true }, take: 1 },
      },
    });

    const top = products
      .map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: Number(p.price),
        stockQty: p.stockQty,
        orders: p._count.orderItems,
        image: p.images[0]?.url || null,
      }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10);

    apiResponse(res, { products: top });
  } catch (error) {
    next(error);
  }
});

router.get('/overview', requireAuth, requireRole(UserRole.MANAGER, UserRole.ADMIN), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const ordersByStatus = await Promise.all(
      ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED'].map(async status => ({
        status,
        count: await prisma.order.count({ where: { status: status as any } }),
      }))
    );

    const monthlyRevenue = await prisma.$queryRawUnsafe(`
      SELECT DATE_TRUNC('month', "createdAt") as month, SUM("totalAmount") as revenue
      FROM orders
      WHERE "createdAt" >= NOW() - INTERVAL '6 months'
        AND "status" NOT IN ('CANCELLED', 'RETURNED', 'REFUNDED')
      GROUP BY month
      ORDER BY month
    `);

    apiResponse(res, { ordersByStatus, monthlyRevenue });
  } catch (error) {
    next(error);
  }
});

export default router;
