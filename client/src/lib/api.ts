import type { ApiResponse } from '../types';

const BASE_URL = '/api/v1';

let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

function forceLogin() {
  try {
    localStorage.removeItem('coreconnect-auth');
  } catch {}
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}, retried = false): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    credentials: 'include',
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
    ...options,
  });

  if (res.status === 401 && !retried && !endpoint.startsWith('/auth/')) {
    const ok = await refreshSession();
    if (ok) return request<T>(endpoint, options, true);
    forceLogin();
    throw new Error('Session expired. Please sign in again.');
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  upload: <T>(endpoint: string, body: FormData) =>
    request<T>(endpoint, { method: 'POST', body }),
  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function formatCurrencyCompact(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

export function chartTicks(dataMax: number, tickCount = 5): { ticks: number[]; max: number } {
  if (dataMax <= 0) return { ticks: [0], max: 1 };
  const pow = Math.pow(10, Math.floor(Math.log10(dataMax)));
  const candidates = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const nice = candidates.find((c) => c >= dataMax / pow) || 10;
  const max = nice * pow;
  const step = max / tickCount;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round(step * i * 100) / 100);
  return { ticks, max };
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}

export function getStockStatus(qty: number, threshold: number) {
  if (qty === 0) return { label: 'Out of Stock', color: 'badge-danger' };
  if (qty <= threshold) return { label: 'Low Stock', color: 'badge-warning' };
  return { label: 'In Stock', color: 'badge-success' };
}

export function getOrderStatusBadge(status: string) {
  const map: Record<string, string> = {
    PENDING: 'badge-warning',
    CONFIRMED: 'badge-info',
    PROCESSING: 'badge-info',
    SHIPPED: 'badge-info',
    DELIVERED: 'badge-success',
    CANCELLED: 'badge-danger',
    RETURNED: 'badge-danger',
    REFUNDED: 'badge-danger',
  };
  return map[status] || 'badge-info';
}
