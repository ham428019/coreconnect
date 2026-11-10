import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { validateRequest } from '../../middleware/validateRequest';
import { registerSchema, loginSchema } from './auth.schema';
import { apiResponse, apiError } from '../../utils/helpers';
import { requireAuth, optionalAuth } from '../../middleware/requireAuth';
import { Router } from 'express';
import { signupLimiter } from '../../middleware/rateLimit';
import { z } from 'zod';
import * as reset from './password-reset.service';
import { newPasswordSchema } from './password.schema';

const router = Router();

router.post('/register', signupLimiter, validateRequest(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
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
    apiResponse(res, result, 'Registration successful');
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
    apiResponse(res, result, 'Login successful');
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
    apiResponse(res, { accessToken: result.accessToken }, 'Token refreshed');
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

const emailSchema = z.object({ email: z.string().email() });
const verifySchema = emailSchema.extend({ otp: z.string().regex(/^\d{6}$/) });
const resetSchema = emailSchema.extend({ resetToken: z.string().min(20), password: newPasswordSchema });

router.post('/forgot-password', validateRequest(emailSchema), async (req, res, next) => {
  try { await reset.sendOtp(req.body.email); apiResponse(res, null, 'If the email is registered, a verification code will be sent.'); }
  catch (error) { next(error); }
});
router.post('/verify-reset-otp', validateRequest(verifySchema), async (req, res, next) => {
  try { const resetToken = await reset.verifyOtp(req.body.email, req.body.otp); apiResponse(res, { resetToken }, 'Code verified'); }
  catch (error) { next(error); }
});
router.post('/reset-password', validateRequest(resetSchema), async (req, res, next) => {
  try { await reset.resetPassword(req.body.email, req.body.resetToken, req.body.password); apiResponse(res, null, 'Password updated successfully'); }
  catch (error) { next(error); }
});

export default router;
