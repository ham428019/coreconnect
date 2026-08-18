import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { apiResponse, apiError } from '../../utils/helpers';
import { UserRole } from '@prisma/client';
import { slugify } from '../../utils/generateIds';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true, parentId: null },
      include: {
        children: {
          where: { isActive: true },
          include: { _count: { select: { products: true } } },
        },
        _count: { select: { products: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
    apiResponse(res, { categories });
  } catch (error) {
    next(error);
  }
});

router.get('/all', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    apiResponse(res, { categories });
  } catch (error) {
    next(error);
  }
});

router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug as string },
      include: {
        children: { where: { isActive: true } },
        parent: true,
      },
    });
    if (!category) return apiError(res, 404, 'Category not found');
    apiResponse(res, { category });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, requireRole(UserRole.MANAGER, UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, imageUrl, parentId, sortOrder } = req.body;
    const category = await prisma.category.create({
      data: {
        name,
        slug: slugify(name),
        description,
        imageUrl,
        parentId,
        sortOrder: sortOrder || 0,
      },
    });
    apiResponse(res, { category }, 'Category created');
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', requireAuth, requireRole(UserRole.MANAGER, UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = { ...req.body };
    if (data.name) data.slug = slugify(data.name);
    const category = await prisma.category.update({
      where: { id: req.params.id as string },
      data,
    });
    apiResponse(res, { category }, 'Category updated');
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAuth, requireRole(UserRole.MANAGER, UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.category.update({
      where: { id: req.params.id as string },
      data: { isActive: false },
    });
    apiResponse(res, null, 'Category deactivated');
  } catch (error) {
    next(error);
  }
});

export default router;
