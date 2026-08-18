import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, ChevronRight } from 'lucide-react';
import { api, formatCurrency, getOrderStatusBadge } from '../lib/api';
import type { Order } from '../types';

export default function OrderHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get<{ orders: Order[] }>('/orders'),
  });

  const orders = data?.data?.orders || [];

  if (isLoading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="card"><div className="skeleton h-20 rounded" /></div>)}</div>;

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <Package size={64} className="mx-auto text-text-muted mb-4" />
        <h2 className="text-xl font-bold mb-2">No orders yet</h2>
        <p className="text-text-muted mb-6">Your order history will appear here.</p>
        <Link to="/" className="btn-primary">Start Shopping</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">My Orders</h1>
      <div className="space-y-3">
        {orders.map((order) => (
          <Link key={order.id} to={`/order-success/${order.id}`} className="card flex items-center gap-4 hover:border-accent transition-colors group">
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
              <Package size={24} className="text-accent" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <p className="font-semibold">#{order.orderNumber}</p>
                <span className={`badge ${getOrderStatusBadge(order.status)}`}>{order.status}</span>
              </div>
              <p className="text-sm text-text-muted mt-0.5">
                {order.items?.length || 0} items &middot; {new Date(order.createdAt).toLocaleDateString()} &middot; {formatCurrency(order.totalAmount)}
              </p>
            </div>
            <ChevronRight size={18} className="text-text-muted group-hover:text-accent transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
