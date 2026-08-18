import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, ShoppingCart, Heart, Minus, Plus, Shield, Truck, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { api, formatCurrency, getStockStatus } from '../lib/api';
import { useAuthStore } from '../stores';
import type { Product, Review } from '../types';
import { useState } from 'react';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuthStore();
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.get<{ product: Product }>(`/products/${slug}`),
    enabled: !!slug,
  });

  const { data: reviewData } = useQuery({
    queryKey: ['reviews', data?.data?.product?.id],
    queryFn: () => api.get<{ reviews: Review[] }>(`/reviews/product/${data?.data?.product?.id}`),
    enabled: !!data?.data?.product?.id,
  });

  const addToCart = useMutation({
    mutationFn: () => api.post('/cart', { productId: product.id, quantity: qty }),
    onSuccess: () => {
      toast.success('Added to cart!');
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addToWishlist = useMutation({
    mutationFn: () => api.post('/wishlist', { productId: product.id }),
    onSuccess: () => toast.success('Added to wishlist!'),
    onError: () => toast.error('Failed to add to wishlist'),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="skeleton aspect-square rounded-xl" />
          <div className="space-y-4">
            <div className="skeleton h-8 w-3/4" />
            <div className="skeleton h-6 w-1/4" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!data?.data?.product) {
    return <div className="text-center py-16"><h2 className="text-xl font-bold">Product not found</h2></div>;
  }

  const product = data.data.product;
  const reviews = reviewData?.data?.reviews || [];
  const stock = getStockStatus(product.stockQty, product.lowStockThreshold);
  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

  return (
    <div>
      <div className="text-sm text-text-muted mb-4">
        <Link to="/" className="hover:text-accent">Home</Link> /
        <Link to={`/category/${product.category.slug}`} className="hover:text-accent"> {product.category.name}</Link> /
        <span className="text-text"> {product.name}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden mb-3">
            <img
              src={product.images?.[activeImage]?.url || '/placeholder/product-1.jpg'}
              alt={product.name}
              className="max-w-full max-h-full object-contain p-4"
            />
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={`w-16 h-16 rounded-lg border-2 overflow-hidden bg-gray-100 ${
                    i === activeImage ? 'border-accent' : 'border-transparent'
                  }`}
                >
                  <img src={img.url} alt={img.altText || ''} className="w-full h-full object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm text-text-muted uppercase tracking-wide">{product.brand?.name || product.category.name}</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">{product.name}</h1>

          <div className="flex items-center gap-2 mt-3">
            <div className="flex text-warning">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} fill={i < 4 ? 'currentColor' : 'none'} className={i < 4 ? 'text-warning' : 'text-gray-300'} />
              ))}
            </div>
            <span className="text-sm text-text-muted">({reviews.length} reviews)</span>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-accent">{formatCurrency(product.price)}</span>
            {product.comparePrice && (
              <>
                <span className="text-lg line-through text-text-muted">{formatCurrency(product.comparePrice)}</span>
                <span className="badge badge-danger">{discount}% OFF</span>
              </>
            )}
          </div>

          <p className={`mt-2 ${product.stockQty === 0 ? 'text-danger' : product.stockQty <= product.lowStockThreshold ? 'text-warning' : 'text-success'} font-medium text-sm`}>
            {stock.label} {product.stockQty > 0 && `(${product.stockQty} available)`}
          </p>

          <p className="text-sm text-text-muted mt-4 leading-relaxed">
            {product.shortDescription || product.description.substring(0, 200)}...
          </p>

          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Quantity:</span>
              <div className="flex items-center border border-border rounded-btn">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-2 hover:bg-gray-50"><Minus size={16} /></button>
                <span className="px-4 font-medium">{qty}</span>
                <button onClick={() => setQty(Math.min(product.stockQty, qty + 1))} className="p-2 hover:bg-gray-50"><Plus size={16} /></button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => addToCart.mutate()}
                disabled={product.stockQty === 0 || addToCart.isPending}
                className="btn-primary flex-1"
              >
                <ShoppingCart size={18} />
                {addToCart.isPending ? 'Adding...' : product.stockQty === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
              <button
                onClick={() => {
                  if (!isAuthenticated) { toast.error('Please login to add to wishlist'); return; }
                  addToWishlist.mutate();
                }}
                className="btn-outline !px-4"
              >
                <Heart size={18} />
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 text-center text-sm">
            {[
              { icon: Truck, label: 'Free Shipping', sub: 'Over $75' },
              { icon: Shield, label: 'Warranty', sub: 'Manufacturer' },
              { icon: RotateCcw, label: 'Returns', sub: '14 Days' },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                <item.icon size={18} className="mx-auto mb-1 text-accent" />
                <p className="font-semibold text-xs">{item.label}</p>
                <p className="text-xs text-text-muted">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {product.specs && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">Specifications</h2>
          <div className="card">
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(product.specs).map(([key, value]) => (
                  <tr key={key} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 text-text-muted font-medium capitalize w-48">{key}</td>
                    <td className="py-3 text-text">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-12">
        <h2 className="text-xl font-bold mb-4">Description</h2>
        <div className="card">
          <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">{product.description}</p>
        </div>
      </div>

      {reviews.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">Customer Reviews ({reviews.length})</h2>
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="card">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-semibold text-sm">
                    {review.user.firstName[0]}{review.user.lastName[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{review.user.firstName} {review.user.lastName}</p>
                    <div className="flex text-warning">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={12} fill={i < review.rating ? 'currentColor' : 'none'} />
                      ))}
                    </div>
                  </div>
                </div>
                {review.title && <p className="font-semibold text-sm mb-1">{review.title}</p>}
                <p className="text-sm text-text-muted">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
