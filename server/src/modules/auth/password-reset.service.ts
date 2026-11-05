import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';

const TEN_MINUTES = 10 * 60 * 1000;
const COOLDOWN = 60 * 1000;
const hash = (value: string) => crypto.createHmac('sha256', env.JWT_REFRESH_SECRET).update(value).digest('hex');
const normalize = (email: string) => email.trim().toLowerCase();

export async function sendOtp(email: string) {
  const user = await prisma.user.findUnique({ where: { email: normalize(email) } });
  if (!user || !user.isActive) return;
  const existing = await prisma.passwordResetOtp.findUnique({ where: { userId: user.id } });
  if (existing && Date.now() - existing.lastSentAt.getTime() < COOLDOWN) {
    throw new AppError(429, 'Please wait 60 seconds before requesting another code');
  }
  if (!env.SMTP_USER || !env.SMTP_PASS) throw new AppError(503, 'Email service is not configured');
  const otp = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: env.SMTP_USER, to: user.email, subject: 'CoreConnect password reset code',
    text: `Your CoreConnect password reset code is ${otp}. It expires in 10 minutes. If you did not request this, ignore this email.`,
  });
  await prisma.passwordResetOtp.upsert({
    where: { userId: user.id },
    create: { userId: user.id, codeHash: hash(otp), expiresAt: new Date(Date.now() + TEN_MINUTES) },
    update: { codeHash: hash(otp), expiresAt: new Date(Date.now() + TEN_MINUTES), attempts: 0, verifiedAt: null, resetTokenHash: null, lastSentAt: new Date() },
  });
}

export async function verifyOtp(email: string, otp: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { email: normalize(email) } });
  if (!user) throw new AppError(400, 'Invalid or expired code');
  const record = await prisma.passwordResetOtp.findUnique({ where: { userId: user.id } });
  if (!record || record.expiresAt.getTime() < Date.now() || record.attempts >= 5 || record.verifiedAt) {
    throw new AppError(400, 'Invalid or expired code');
  }
  await prisma.passwordResetOtp.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
  const supplied = Buffer.from(hash(otp), 'hex');
  const expected = Buffer.from(record.codeHash, 'hex');
  if (!crypto.timingSafeEqual(supplied, expected)) throw new AppError(400, 'Invalid or expired code');
  const token = crypto.randomBytes(32).toString('hex');
  await prisma.passwordResetOtp.update({
    where: { id: record.id }, data: { verifiedAt: new Date(), resetTokenHash: hash(token) },
  });
  return token;
}

export async function resetPassword(email: string, token: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: normalize(email) } });
  if (!user) throw new AppError(400, 'Invalid or expired reset request');
  const record = await prisma.passwordResetOtp.findUnique({ where: { userId: user.id } });
  if (!record?.verifiedAt || !record.resetTokenHash || record.expiresAt.getTime() < Date.now()) {
    throw new AppError(400, 'Invalid or expired reset request');
  }
  const provided = Buffer.from(hash(token), 'hex');
  const expected = Buffer.from(record.resetTokenHash, 'hex');
  if (!crypto.timingSafeEqual(provided, expected)) throw new AppError(400, 'Invalid or expired reset request');
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetOtp.delete({ where: { id: record.id } }),
  ]);
}
