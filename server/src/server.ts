import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env';
import { errorHandler, AppError } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import productRoutes from './modules/products/product.routes';
import categoryRoutes from './modules/categories/category.routes';
import cartRoutes from './modules/cart/cart.routes';
import orderRoutes from './modules/orders/order.routes';
import paymentRoutes from './modules/payments/payment.routes';
import reviewRoutes from './modules/reviews/review.routes';
import wishlistRoutes from './modules/wishlist/wishlist.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import aiRoutes from './modules/ai/ai.routes';
import couponRoutes from './modules/coupons/coupon.routes';
import uploadRoutes from './modules/uploads/upload.routes';
import { backfillStructuredProductData } from './modules/products/product-data.service';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/coupons', couponRoutes);
app.use('/api/v1/uploads', uploadRoutes);

app.get('/api/v1/health', (_req, res) => {
  res.json({ success: true, message: 'CoreConnect API is running' });
});

if (env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((_req, _res, next) => {
  next(new AppError(404, 'Route not found'));
});

app.use(errorHandler);

async function startServer() {
  try {
    await backfillStructuredProductData();
  } catch (error) {
    console.error('[catalog] Could not backfill structured product fields:', error);
  }

  app.listen(env.PORT, () => {
    console.log(`CoreConnect API running on port ${env.PORT}`);
    console.log(`Environment: ${env.NODE_ENV}`);
  });
}

void startServer();

export default app;
