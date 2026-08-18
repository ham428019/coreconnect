import { Request, Response } from 'express';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function apiResponse<T>(res: Response, data: T, message?: string, meta?: PaginationMeta) {
  res.json({ success: true, data, message, meta });
}

export function apiError(res: Response, status: number, message: string, errors?: unknown[]) {
  res.status(status).json({ success: false, message, errors });
}

export function getPagination(query: { page?: string; limit?: string }) {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(1000, Math.max(1, parseInt(query.limit || '20', 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
