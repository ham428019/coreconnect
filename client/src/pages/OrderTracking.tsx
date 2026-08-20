import { Fragment, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Package, Truck, CheckCircle2, RefreshCw, CheckCheck,
  XCircle, MapPin, ArrowLeft, Copy, RotateCcw, Undo2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api, formatCurrency, getOrderStatusBadge } from '../lib/api';
import type { Order, OrderStatus } from '../types';

const FLOW: { status: OrderStatus; label: string; icon: LucideIcon }[] = [
  { status: 'PENDING', label: 'Order Placed', icon: Package },
  { status: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle2 },
  { status: 'PROCESSING', label: 'Processing', icon: RefreshCw },
  { status: 'SHIPPED', label: 'Shipped', icon: Truck },
  { status: 'DELIVERED', label: 'Delivered', icon: CheckCheck },
];

const TERMINAL: Record<string, { label: string; icon: LucideIcon; cls: string }> = {
  CANCELLED: { label: 'This order was cancelled', icon: XCircle, cls: 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400' },
  RETURNED: { label: 'This order was returned', icon: Undo2, cls: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  REFUNDED: { label: 'This order was refunded', icon: RotateCcw, cls: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
};

const fmt = (t?: string) => (t ? new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');

export default function OrderTracking() {
  const { id } = useParams<{ id: string }>();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get<{ order: Order }>(`/orders/${id}`),
    enabled: !!id,
  });

  const order = data?.data?.order;

  if (isLoading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="card"><div className="skeleton h-28 rounded" /></div>)}</div>;

  if (!order || isError) {
    return (
      <div className="text-center py-16">
        <Package size={64} className="mx-auto text-text-muted mb-4" />
        <h2 className="text-xl font-bold mb-2">Order not found</h2>
        <p className="text-text-muted mb-6">We could not find this order, or you do not have access to it.</p>
        <Link to="/orders" className="btn-primary"><ArrowLeft size={18} /> Back to My Orders</Link>
      </div>
    );
  }

  const stepTime = (status: OrderStatus) => {
    if (status === 'PENDING') return fmt(order.createdAt);
    if (status === 'SHIPPED') return fmt(order.shippedAt);
    if (status === 'DELIVERED') return fmt(order.deliveredAt);
    return '';
  };

  const currentIndex = FLOW.findIndex(s => s.status === order.status);
  const terminal = TERMINAL[order.status];
  const addr = order.shippingAddress;

  const copyTracking = async () => {
    if (!order.trackingNumber) return;
    try {
      await navigator.clipboard.writeText(order.trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <div>
      <Link to="/orders" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-accent mb-4">
        <ArrowLeft size={16} /> Back to My Orders
      </Link>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="font-display text-2xl font-bold">Track Order</h1>
        <span className={`badge ${getOrderStatusBadge(order.status)}`}>{order.status}</span>
      </div>

      <div className="card mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="font-semibold">Order <span className="text-accent">#{order.orderNumber}</span></p>
            <p className="text-sm text-text-muted">Placed {fmt(order.createdAt)}</p>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(order.totalAmount)}</p>
        </div>

        {terminal ? (
          <div className={`flex items-center gap-3 rounded-lg border p-4 ${terminal.cls}`}>
            <terminal.icon size={24} />
            <div>
              <p className="font-semibold">{terminal.label}</p>
              <p className="text-sm opacity-80">If you have questions, contact our support team.</p>
            </div>
          </div>
        ) : currentIndex >= 0 ? (
          <div className="relative pt-4 pb-2">
            <div className="absolute top-7 left-[10%] right-[10%] h-0.5 bg-gray-200 dark:bg-gray-700" />
            <div className="absolute top-7 left-[10%] h-0.5 bg-accent transition-all" style={{ width: `${(currentIndex / (FLOW.length - 1)) * 80}%` }} />
            <div className="grid grid-cols-5 relative">
              {FLOW.map((step, i) => {
                const done = i < currentIndex || (i === currentIndex && currentIndex === FLOW.length - 1);
                const current = i === currentIndex && currentIndex < FLOW.length - 1;
                const time = stepTime(step.status);
                return (
                  <div key={step.status} className="flex flex-col items-center text-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 ${done ? 'bg-accent border-accent text-white' : current ? 'bg-accent/15 border-accent text-accent' : 'border-gray-300 text-text-muted dark:border-gray-600 dark:text-gray-400'}`}>
                      <step.icon size={16} />
                    </div>
                    <p className={`text-xs font-semibold mt-2 ${done || current ? 'text-accent' : 'text-text-muted dark:text-gray-400'}`}>{step.label}</p>
                    {time && <p className="text-[10px] text-text-muted dark:text-gray-500 mt-0.5">{time}</p>}
                    {current && <p className="text-[10px] font-semibold text-accent mt-0.5">In progress</p>}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {order.trackingNumber && (
        <div className="card mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <Truck size={20} className="text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Tracking Number</p>
              <p className="font-semibold font-mono">{order.trackingNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Carrier</p>
              <p className="font-medium">{order.carrier || 'Standard'}</p>
            </div>
            <button onClick={copyTracking} className="btn-outline text-sm !px-3 !py-1.5">
              <Copy size={14} /> {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><MapPin size={16} className="text-accent" /> Shipping Address</h3>
          <p className="text-sm text-text-muted dark:text-gray-300">{addr?.label || 'Shipping'}</p>
          <p className="text-sm text-text-muted dark:text-gray-300">{addr?.street}</p>
          <p className="text-sm text-text-muted dark:text-gray-300">{addr?.city}, {addr?.state} {addr?.zipCode}</p>
          <p className="text-sm text-text-muted dark:text-gray-300">{addr?.country}</p>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-3">Order Summary</h3>
          <div className="space-y-1.5 text-sm">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-2">
                <span className="truncate">{item.productName} <span className="text-text-muted">x {item.quantity}</span></span>
                <span className="font-medium whitespace-nowrap">{formatCurrency(Number(item.totalPrice))}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2 space-y-1">
              <div className="flex justify-between"><span className="text-text-muted">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Shipping</span><span>{order.shippingCost > 0 ? formatCurrency(order.shippingCost) : 'Free'}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Tax</span><span>{formatCurrency(order.taxAmount)}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Payment</span><span className="capitalize">{order.paymentMethod} · {order.paymentStatus}</span></div>
              <div className="flex justify-between font-bold text-base pt-1 border-t"><span>Total</span><span>{formatCurrency(order.totalAmount)}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to={`/order-success/${order.id}`} className="btn-outline">View Receipt</Link>
        <Link to="/" className="btn-primary">Continue Shopping</Link>
      </div>
    </div>
  );
}