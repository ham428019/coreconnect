import { z } from 'zod';
import { newPasswordSchema } from './password.schema';

export const registerSchema = z.object({
  email: z.string().email(),
  password: newPasswordSchema,
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string(),
});
