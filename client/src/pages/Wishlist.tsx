import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, formatCurrency } from '../lib/api';
import type { Product } from '../types';

interface WishlistItem {
  id: string;
  product: Product;
}

export default function Wishlist() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get<{ items: WishlistItem[] }>('/wishlist'),
  });

  const removeItem = useMutation({
    mutationFn: (productId: string) => api.delete(`/wishlist/${productId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['wishlist'] }); toast.success('Removed from wishlist'); },
  });

  const addToCart = useMutation({
    mutationFn: (productId: string) => api.post('/cart', { productId, quantity: 1 }),
    onSuccess: () => toast.success('Added to cart!'),
    onError: (err: Error) => toast.error(err.message),
  });

  const items = data?.data?.items || [];

  if (isLoading) return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <div key={i} className="card"><div className="skeleton aspect-square rounded-lg mb-3" /><div className="skeleton h-4 w-3/4" /></div>)}</div>;

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <Heart size={64} className="mx-auto text-text-muted mb-4" />
        <h2 className="text-xl font-bold mb-2">Your wishlist is empty</h2>
        <p className="text-text-muted mb-6">Save items you love for later.</p>
        <Link to="/" className="btn-primary">Browse Products</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">My Wishlist ({items.length})</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="card group">
            <Link to={`/product/${item.product.slug}`} className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-3 overflow-hidden">
              <img src={item.product.images?.[0]?.url || '/placeholder/product-1.jpg'} alt={item.product.name}
                className="max-w-full max-h-full object-contain p-4 group-hover:scale-105 transition-transform" />
            </Link>
            <Link to={`/product/${item.product.slug}`} className="font-semibold text-sm group-hover:text-accent transition-colors line-clamp-2">
              {item.product.name}
            </Link>
            <p className="text-accent font-bold mt-1">{formatCurrency(item.product.price)}</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => addToCart.mutate(item.product.id)} className="btn-primary flex-1 text-sm !py-2">
                <ShoppingCart size={14} /> Add to Cart
              </button>
              <button onClick={() => removeItem.mutate(item.product.id)} className="btn-ghost !px-2 text-text-muted hover:text-danger">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
