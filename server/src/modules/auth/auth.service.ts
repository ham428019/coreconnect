import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AuthPayload } from '../../middleware/requireAuth';
import { UserRole } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler';

function signAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRY } as any);
}

function signRefreshToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRY } as any);
}

function getTokenExpiry(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

export async function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError(409, 'Email already registered');

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
    },
  });

  const payload: AuthPayload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: getTokenExpiry(),
    },
  });

  const { passwordHash: _, ...userSafe } = user;
  return { user: userSafe, accessToken, refreshToken };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(401, 'Invalid email or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError(401, 'Invalid email or password');

  if (!user.isActive) throw new AppError(403, 'Account is deactivated');

  const payload: AuthPayload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: getTokenExpiry(),
    },
  });

  const { passwordHash: _, ...userSafe } = user;
  return { user: userSafe, accessToken, refreshToken };
}

export async function refresh(userToken: string) {
  let payload: AuthPayload;
  try {
    payload = jwt.verify(userToken, env.JWT_REFRESH_SECRET) as AuthPayload;
  } catch {
    throw new AppError(401, 'Invalid refresh token');
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: userToken } });
  if (!stored) throw new AppError(401, 'Token not found');

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new AppError(401, 'User not found');

  const newPayload: AuthPayload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(newPayload);
  const refreshToken = signRefreshToken(newPayload);

  await prisma.refreshToken.delete({ where: { id: stored.id } });
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: getTokenExpiry(),
    },
  });

  return { accessToken, refreshToken };
}

export async function logout(userId: string, token?: string) {
  if (token) {
    await prisma.refreshToken.deleteMany({ where: { userId, token } });
  } else {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');
  const { passwordHash: _, ...userSafe } = user;
  return userSafe;
}
