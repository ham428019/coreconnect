import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { apiResponse, apiError, getPagination, buildMeta } from '../../utils/helpers';
import { UserRole } from '@prisma/client';
import { generateSKU, slugify } from '../../utils/generateIds';
import { deriveStructuredProductData } from './product-data.service';

const router = Router();

const stringList = (value: unknown): string[] => Array.isArray(value)
  ? value.map(item => String(item).trim()).filter(Boolean)
  : [];

function productWriteData(body: Record<string, any>, partial = false) {
  const has = (key: string) => !partial || Object.prototype.hasOwnProperty.call(body, key);
  const tags = stringList(body.tags);
  const specs = body.specs && typeof body.specs === 'object' ? body.specs : {};
  const derived = deriveStructuredProductData({
    tags,
    specs,
    shortDescription: body.shortDescription || null,
  });
  const keyFeatures = stringList(body.keyFeatures);
  const compatibility = stringList(body.compatibility);
  const useCases = stringList(body.useCases);
  const colors = stringList(body.colors);
  return {
    name: body.name,
    description: body.description,
    shortDescription: has('shortDescription') ? body.shortDescription || null : undefined,
    price: body.price,
    comparePrice: has('comparePrice') ? body.comparePrice || null : undefined,
    costPrice: has('costPrice') ? body.costPrice || null : undefined,
    stockQty: body.stockQty === undefined ? undefined : Number(body.stockQty),
    lowStockThreshold: body.lowStockThreshold === undefined ? undefined : Number(body.lowStockThreshold),
    categoryId: body.categoryId,
    brandId: has('brandId') ? body.brandId || null : undefined,
    specs: has('specs') ? specs : undefined,
    tags: has('tags') ? tags : undefined,
    productType: has('productType') || has('tags') ? body.productType || derived.productType : undefined,
    keyFeatures: has('keyFeatures') || has('specs') ? (keyFeatures.length ? keyFeatures : derived.keyFeatures) : undefined,
    warranty: has('warranty') || has('specs') ? body.warranty || derived.warranty : undefined,
    compatibility: has('compatibility') || has('specs') ? (compatibility.length ? compatibility : derived.compatibility) : undefined,
    useCases: has('useCases') || has('tags') ? (useCases.length ? useCases : derived.useCases) : undefined,
    colors: has('colors') || has('specs') ? (colors.length ? colors : derived.colors) : undefined,
    dimensions: has('dimensions') ? body.dimensions || null : undefined,
    weight: has('weight') ? (body.weight === null || body.weight === '' ? null : Number(body.weight)) : undefined,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
    isFeatured: typeof body.isFeatured === 'boolean' ? body.isFeatured : undefined,
    isDigital: typeof body.isDigital === 'boolean' ? body.isDigital : undefined,
  };
}

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

router.get('/meta/options', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [categories, brands] = await Promise.all([
      prisma.category.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.brand.findMany({ orderBy: { name: 'asc' } }),
    ]);
    apiResponse(res, { categories, brands });
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
    const { name, categoryId, brandId, images } = req.body;

    const slug = slugify(name);
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    const brand = brandId ? await prisma.brand.findUnique({ where: { id: brandId } }) : null;
    const sku = generateSKU(category?.name || 'GEN', brand?.name || 'GEN');

    const product = await prisma.product.create({
      data: {
        ...productWriteData(req.body),
        slug,
        sku,
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
    const data = productWriteData(req.body, true);
    if (req.body.name) {
      data.name = req.body.name;
    }
    const product = await prisma.product.update({
      where: { id: req.params.id as string },
      data,
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
