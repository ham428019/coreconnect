import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { apiResponse, apiError } from '../../utils/helpers';
import { UserRole } from '@prisma/client';

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '..', '..', '..', 'uploads', 'products'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      cb(new Error('Only image files are allowed (jpg, png, webp, gif, avif)'));
    } else {
      cb(null, true);
    }
  },
});

const router = Router();

router.post('/', requireAuth, requireRole(UserRole.MANAGER, UserRole.ADMIN), (req: Request, res: Response, next: NextFunction) => {
  upload.array('images', 5)(req, res, (err: any) => {
    if (err) return apiError(res, 400, err.message);
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) return apiError(res, 400, 'No image files provided');
    apiResponse(res, {
      images: files.map(f => ({ url: `/uploads/products/${f.filename}` })),
    }, 'Upload successful');
  });
});

export default router;