import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import { api, formatCurrency } from '../lib/api';
import type { Order } from '../types';

export default function OrderSuccess() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get<{ order: Order }>(`/orders/${id}`),
    enabled: !!id,
  });

  const order = data?.data?.order;

  if (isLoading) return <div className="text-center py-16"><div className="skeleton h-48 rounded-xl" /></div>;

  if (!order) return <div className="text-center py-16"><h2 className="text-xl font-bold">Order not found</h2></div>;

  return (
    <div className="text-center">
      <CheckCircle size={64} className="mx-auto text-success mb-4" />
      <h1 className="font-display text-2xl font-bold mb-2">Order Confirmed!</h1>
      <p className="text-text-muted mb-8">
        Thank you for your order. Your order number is <span className="font-bold text-text">#{order.orderNumber}</span>
      </p>

      <div className="card text-left mb-8">
        <h3 className="font-semibold mb-3">Order Details</h3>
        <div className="space-y-2 text-sm">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>{item.productName} x {item.quantity}</span>
              <span>{formatCurrency(Number(item.totalPrice))}</span>
            </div>
          ))}
          <div className="border-t pt-2 mt-2 space-y-1">
            <div className="flex justify-between"><span className="text-text-muted">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Shipping</span><span>{order.shippingCost > 0 ? formatCurrency(order.shippingCost) : 'Free'}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Tax</span><span>{formatCurrency(order.taxAmount)}</span></div>
            <div className="flex justify-between font-bold text-lg pt-1 border-t"><span>Total</span><span>{formatCurrency(order.totalAmount)}</span></div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <Link to="/orders" className="btn-outline"><Package size={18} /> View Orders</Link>
        <Link to="/" className="btn-primary">Continue Shopping <ArrowRight size={18} /></Link>
      </div>
    </div>
  );
}
