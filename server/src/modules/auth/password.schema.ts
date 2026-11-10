import { z } from 'zod';

// Apply only when a password is created or replaced. Login accepts legacy passwords.
const commonPasswords = new Set([
  'password123', 'password1234', 'password12345', '123456789012',
  'qwerty123456', 'admin12345678', 'letmein123456', 'iloveyou12345',
]);
export const newPasswordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .max(72, 'Password must be at most 72 characters (bcrypt limit)')
  .regex(/[A-Z]/, 'Include at least one uppercase letter')
  .regex(/[a-z]/, 'Include at least one lowercase letter')
  .regex(/[0-9]/, 'Include at least one number')
  .regex(/[^A-Za-z0-9\s]/, 'Include at least one special symbol')
  .refine(value => !commonPasswords.has(value.toLowerCase()), 'Choose a less common password');
