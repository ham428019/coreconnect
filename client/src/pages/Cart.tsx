import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Minus, Plus, ShoppingCart, ArrowLeft, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { api, formatCurrency } from '../lib/api';
import { useAuthStore } from '../stores';
import type { CartItem } from '../types';

export default function Cart() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get<{ items: CartItem[]; summary: { subtotal: number; itemCount: number } }>('/cart'),
    enabled: isAuthenticated,
  });

  const updateQty = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      api.patch(`/cart/${id}`, { quantity }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const removeItem = useMutation({
    mutationFn: (id: string) => api.delete(`/cart/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cart'] }); toast.success('Item removed'); },
  });

  const items = data?.data?.items || [];
  const summary = data?.data?.summary || { subtotal: 0, itemCount: 0 };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-16">
        <LogIn size={64} className="mx-auto text-text-muted mb-4" />
        <h2 className="text-xl font-bold mb-2">Sign in to view your cart</h2>
        <p className="text-text-muted mb-6">Your cart is saved to your account. Log in to see your items and continue shopping.</p>
        <div className="flex justify-center gap-3">
          <Link to="/login" className="btn-primary">Sign In</Link>
          <Link to="/register" className="btn-outline">Create Account</Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="card"><div className="skeleton h-24 rounded-lg" /></div>)}</div>;
  }

  if (isError) {
    return (
      <div className="text-center py-16">
        <ShoppingCart size={64} className="mx-auto text-text-muted mb-4" />
        <h2 className="text-xl font-bold mb-2">Couldn't load your cart</h2>
        <p className="text-text-muted mb-6">Something went wrong. Please try again.</p>
        <button onClick={() => queryClient.invalidateQueries({ queryKey: ['cart'] })} className="btn-primary">Try Again</button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <ShoppingCart size={64} className="mx-auto text-text-muted mb-4" />
        <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-text-muted mb-6">Looks like you haven't added anything yet.</p>
        <Link to="/" className="btn-primary">Start Shopping</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Shopping Cart ({summary.itemCount} items)</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="card flex gap-4">
              <Link to={`/product/${item.product.slug}`} className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                <img src={item.product.images?.[0]?.url || '/placeholder/product-1.jpg'} alt={item.product.name} className="w-full h-full object-contain p-2" />
              </Link>
              <div className="flex-1">
                <Link to={`/product/${item.product.slug}`} className="font-semibold text-sm hover:text-accent transition-colors">
                  {item.product.name}
                </Link>
                <p className="text-sm text-text-muted mt-0.5">{item.product.category?.name}</p>
                <p className="font-bold text-accent mt-1">{formatCurrency(Number(item.product.price))}</p>
              </div>
              <div className="flex flex-col items-end justify-between">
                <button onClick={() => removeItem.mutate(item.id)} className="p-1 text-text-muted hover:text-danger transition-colors">
                  <Trash2 size={16} />
                </button>
                <div className="flex items-center border border-border rounded-btn">
                  <button onClick={() => updateQty.mutate({ id: item.id, quantity: item.quantity - 1 })} className="p-1.5 hover:bg-gray-50"><Minus size={14} /></button>
                  <span className="px-3 text-sm font-medium">{item.quantity}</span>
                  <button onClick={() => updateQty.mutate({ id: item.id, quantity: item.quantity + 1 })} className="p-1.5 hover:bg-gray-50"><Plus size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card h-fit sticky top-20">
          <h2 className="font-semibold text-lg mb-4">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Subtotal ({summary.itemCount} items)</span>
              <span>{formatCurrency(summary.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Shipping</span>
              <span>{summary.subtotal >= 75 ? 'Free' : 'Calculated at checkout'}</span>
            </div>
          </div>
          <div className="border-t border-border mt-3 pt-3 flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>{formatCurrency(summary.subtotal)}</span>
          </div>
          <Link to="/checkout" className="btn-primary w-full mt-4">Proceed to Checkout</Link>
          <Link to="/" className="btn-ghost w-full mt-2 text-sm justify-center">
            <ArrowLeft size={14} /> Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
