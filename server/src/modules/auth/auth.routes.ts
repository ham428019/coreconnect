import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { validateRequest } from '../../middleware/validateRequest';
import { registerSchema, loginSchema } from './auth.schema';
import { apiResponse, apiError } from '../../utils/helpers';
import { requireAuth, optionalAuth } from '../../middleware/requireAuth';
import { Router } from 'express';

const router = Router();

router.post('/register', validateRequest(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.register(req.body);
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    apiResponse(res, { user: result.user }, 'Registration successful');
  } catch (error) {
    next(error);
  }
});

router.post('/login', validateRequest(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.login(req.body.email, req.body.password);
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    apiResponse(res, { user: result.user }, 'Login successful');
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.body?.refreshToken || req.cookies?.refreshToken;
    if (!token) {
      apiError(res, 400, 'Refresh token required');
      return;
    }
    const result = await authService.refresh(token);
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    apiResponse(res, null, 'Token refreshed');
  } catch (error) {
    next(error);
  }
});

router.post('/logout', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.logout(req.user!.userId, req.cookies?.refreshToken);
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    apiResponse(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getMe(req.user!.userId);
    apiResponse(res, { user });
  } catch (error) {
    next(error);
  }
});

export default router;
