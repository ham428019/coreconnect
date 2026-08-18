import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { apiResponse, apiError, getPagination, buildMeta } from '../../utils/helpers';
import { UserRole } from '@prisma/client';
import { generateSKU, slugify } from '../../utils/generateIds';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { category, brand, minPrice, maxPrice, sort, search, featured } = req.query;

    const where: any = { isActive: true };

    if (category) where.category = { slug: category as string };
    if (brand) where.brand = { slug: brand as string };
    if (featured === 'true') where.isFeatured = true;
    if (minPrice) where.price = { ...where.price, gte: parseFloat(minPrice as string) };
    if (maxPrice) where.price = { ...where.price, lte: parseFloat(maxPrice as string) };
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { tags: { hasSome: [(search as string).toLowerCase()] } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    switch (sort) {
      case 'price_asc': orderBy = { price: 'asc' }; break;
      case 'price_desc': orderBy = { price: 'desc' }; break;
      case 'name_asc': orderBy = { name: 'asc' }; break;
      case 'name_desc': orderBy = { name: 'desc' }; break;
      case 'newest': orderBy = { createdAt: 'desc' }; break;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: true,
          brand: true,
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const formatted = products.map(p => ({
      ...p,
      price: Number(p.price),
      comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
      costPrice: p.costPrice ? Number(p.costPrice) : null,
    }));

    apiResponse(res, { products: formatted }, undefined, buildMeta(page, limit, total));
  } catch (error) {
    next(error);
  }
});

router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string;
    if (!q) return apiError(res, 400, 'Search query required');

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { shortDescription: { contains: q, mode: 'insensitive' } },
          { tags: { hasSome: [q.toLowerCase()] } },
        ],
      },
      take: 50,
      include: {
        category: true,
        brand: true,
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      },
    });

    const formatted = products.map(p => ({
      ...p,
      price: Number(p.price),
      comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
    }));

    apiResponse(res, { products: formatted });
  } catch (error) {
    next(error);
  }
});

router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug as string },
      include: {
        category: true,
        brand: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
        reviews: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!product) return apiError(res, 404, 'Product not found');

    const formatted = {
      ...product,
      price: Number(product.price),
      comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
      costPrice: product.costPrice ? Number(product.costPrice) : null,
    };

    apiResponse(res, { product: formatted });
  } catch (error) {
    next(error);
  }
});

router.post('/admin', requireAuth, requireRole(UserRole.MANAGER, UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, shortDescription, price, comparePrice, costPrice, stockQty, categoryId, brandId, specs, tags, images } = req.body;

    const slug = slugify(name);
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    const brand = brandId ? await prisma.brand.findUnique({ where: { id: brandId } }) : null;
    const sku = generateSKU(category?.name || 'GEN', brand?.name || 'GEN');

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        sku,
        description,
        shortDescription,
        price,
        comparePrice,
        costPrice,
        stockQty: stockQty || 0,
        categoryId,
        brandId,
        specs,
        tags: tags || [],
        images: images ? {
          create: images.map((img: any, idx: number) => ({
            url: img.url,
            altText: img.altText || name,
            isPrimary: idx === 0,
            sortOrder: idx,
          })),
        } : undefined,
      },
      include: {
        category: true,
        brand: true,
        images: true,
      },
    });

    apiResponse(res, { product }, 'Product created');
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/:id/stock', requireAuth, requireRole(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { stockQty } = req.body;
    if (typeof stockQty !== 'number' || stockQty < 0) {
      return apiError(res, 400, 'Invalid stock quantity');
    }
    const product = await prisma.product.update({
      where: { id: req.params.id as string },
      data: { stockQty },
      select: { id: true, name: true, sku: true, stockQty: true },
    });
    apiResponse(res, { product }, 'Stock updated');
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/:id', requireAuth, requireRole(UserRole.MANAGER, UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id as string },
      data: req.body,
      include: { category: true, brand: true, images: true },
    });
    apiResponse(res, { product }, 'Product updated');
  } catch (error) {
    next(error);
  }
});

router.delete('/admin/:id', requireAuth, requireRole(UserRole.MANAGER, UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id as string } });
    apiResponse(res, null, 'Product deleted');
  } catch (error) {
    next(error);
  }
});

export default router;
