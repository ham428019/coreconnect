import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, ChevronRight, Truck } from 'lucide-react';
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
          <div key={order.id} className="card flex items-center gap-4 group">
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
              <Package size={24} className="text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <Link to={`/track/${order.id}`} className="font-semibold hover:text-accent">#{order.orderNumber}</Link>
                <span className={`badge ${getOrderStatusBadge(order.status)}`}>{order.status}</span>
              </div>
              <p className="text-sm text-text-muted mt-0.5 truncate">
                {order.items?.length || 0} items &middot; {new Date(order.createdAt).toLocaleDateString()} &middot; {formatCurrency(order.totalAmount)}
              </p>
            </div>
            <Link to={`/track/${order.id}`} className="btn-outline text-sm !px-3 !py-1.5 whitespace-nowrap">
              <Truck size={14} /> Track Order
            </Link>
            <Link to={`/order-success/${order.id}`} className="text-text-muted hover:text-accent transition-colors" title="View receipt">
              <ChevronRight size={18} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
