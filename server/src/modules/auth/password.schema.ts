import { z } from 'zod';

// Apply only when a password is created or replaced. Login accepts legacy passwords.
const commonPasswords = new Set([
  'password123', 'password1234', 'password12345', '123456789012',
  'qwerty123456', 'admin12345678', 'letmein123456', 'iloveyou12345',
]);
export const newPasswordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .max(72, 'Password must be at most 72 characters (bcrypt limit)')
  .refine(value => !commonPasswords.has(value.toLowerCase()), 'Choose a less common password');
