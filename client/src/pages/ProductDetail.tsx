import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, ShoppingCart, Heart, Minus, Plus, Shield, Truck, RotateCcw, Sparkles, Loader2, CheckCircle2, Info } from 'lucide-react';
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
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summarySource, setSummarySource] = useState<'ai' | 'catalog' | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
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

  const generateSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await api.post<{ summary: string; source: 'ai' | 'catalog'; warning?: string }>('/ai/summarize', { slug: product.slug });
      setAiSummary(res.data.summary);
      setSummarySource(res.data.source);
      if (res.data.warning) {
        setSummaryError(res.data.warning);
        toast.warning(res.data.warning);
      }
    } catch (err: any) {
      const message = err.message || 'AI summary is unavailable right now. Please try again later.';
      setSummaryError(message);
      toast.error(message);
    } finally {
      setSummaryLoading(false);
    }
  };

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
  const detailRows = [
    ['Brand', product.brand?.name],
    ['Category', product.category?.name],
    ['Product type', product.productType],
    ['SKU', product.sku],
    ['Warranty', product.warranty],
    ['Compatibility', product.compatibility?.join(', ')],
    ['Use cases', product.useCases?.join(', ')],
    ['Colors', product.colors?.join(', ')],
    ['Dimensions', product.dimensions],
    ['Weight', product.weight != null ? `${product.weight} kg` : undefined],
  ].filter((row): row is string[] => Boolean(row[1]));

  return (
    <div>
      <div className="text-sm text-text-muted dark:text-gray-400 mb-4">
        <Link to="/" className="hover:text-accent">Home</Link> /
        <Link to={`/category/${product.category.slug}`} className="hover:text-accent"> {product.category.name}</Link> /
        <span className="text-text dark:text-gray-200"> {product.name}</span>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2">
          <div className="aspect-[4/3] bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden mb-3">
            <img
              src={product.images?.[activeImage]?.url || '/placeholder/product-1.jpg'}
              alt={product.name}
              className="max-w-full max-h-full object-contain p-3"
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

        <div className="lg:col-span-3">
          <p className="text-xs text-text-muted uppercase tracking-wide">{product.brand?.name || product.category.name}</p>
          <h1 className="text-xl md:text-2xl font-bold mt-1">{product.name}</h1>

          <div className="flex items-center gap-2 mt-3">
            <div className="flex text-warning">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} fill={i < 4 ? 'currentColor' : 'none'} className={i < 4 ? 'text-warning' : 'text-gray-300'} />
              ))}
            </div>
            <span className="text-sm text-text-muted">({reviews.length} reviews)</span>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-bold text-accent">{formatCurrency(product.price)}</span>
            {product.comparePrice && (
              <>
                <span className="text-base line-through text-text-muted">{formatCurrency(product.comparePrice)}</span>
                <span className="badge badge-danger">{discount}% OFF</span>
              </>
            )}
          </div>

          <p className={`mt-2 ${product.stockQty === 0 ? 'text-danger' : product.stockQty <= product.lowStockThreshold ? 'text-warning' : 'text-success'} font-medium text-sm`}>
            {stock.label} {product.stockQty > 0 && `(${product.stockQty} available)`}
          </p>

          <p className="text-sm text-text-muted mt-4 leading-relaxed">
            {product.shortDescription || product.description.substring(0, 200)}{!product.shortDescription && product.description.length > 200 ? '…' : ''}
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
                className="btn-primary flex-1 !px-4 !py-2.5"
              >
                <ShoppingCart size={16} />
                {addToCart.isPending ? 'Adding...' : product.stockQty === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
              <button
                onClick={() => {
                  if (!isAuthenticated) { toast.error('Please login to add to wishlist'); return; }
                  addToWishlist.mutate();
                }}
                className="btn-outline !px-3 !py-2.5"
              >
                <Heart size={18} />
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 text-center text-sm">
            {[
              { icon: Truck, label: 'Free Shipping', sub: 'Over $75' },
              { icon: Shield, label: 'Warranty', sub: product.warranty || 'See product info' },
              { icon: RotateCcw, label: 'Returns', sub: '14 Days' },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-bg p-3 dark:bg-slate-800">
                <item.icon size={18} className="mx-auto mb-1 text-accent" />
                <p className="font-semibold text-xs">{item.label}</p>
                <p className="text-xs text-text-muted">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {(product.keyFeatures?.length > 0 || detailRows.length > 0) && (
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {product.keyFeatures?.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-bold">Key Features</h2>
              <div className="card h-[calc(100%-2.75rem)]">
                <ul className="grid gap-3 sm:grid-cols-2">
                  {product.keyFeatures.map(feature => (
                    <li key={feature} className="flex items-start gap-2 text-sm leading-6 text-text-muted dark:text-slate-300">
                      <CheckCircle2 size={17} className="mt-1 shrink-0 text-accent" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
          {detailRows.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-bold">Product Information</h2>
              <dl className="card grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {detailRows.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</dt>
                    <dd className="mt-1 text-sm font-medium text-text dark:text-slate-200">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      )}

      {product.specs && Object.keys(product.specs).length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">Specifications</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <tbody>
                {Object.entries(product.specs).map(([key, value]) => (
                  <tr key={key} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 text-text-muted dark:text-gray-400 font-medium capitalize w-48 whitespace-nowrap">{key}</td>
                    <td className="py-3 text-text dark:text-gray-200">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold">Description</h2>
          <button
            onClick={generateSummary}
            disabled={summaryLoading}
            className="btn-outline text-sm !px-3 !py-1.5"
          >
            {summaryLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {summaryLoading ? 'Generating...' : aiSummary ? 'Regenerate AI Summary' : 'AI Summary'}
          </button>
        </div>
        <div className="card">
          {aiSummary && (
            <div className="mb-4 p-3 rounded-lg bg-accent/10 border border-accent/30 text-sm">
              <p className="font-semibold text-accent mb-1">{summarySource === 'catalog' ? 'Catalog Summary' : 'AI Summary'}</p>
              <p className="text-text dark:text-gray-200 leading-relaxed">{aiSummary}</p>
            </div>
          )}
          {summaryError && (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-danger/25 bg-danger/5 p-3 text-sm text-danger">
              <Info size={17} className="mt-0.5 shrink-0" />
              <p>{summaryError}</p>
            </div>
          )}
          <p className="text-sm text-text-muted dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{product.description}</p>
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
                <p className="text-sm text-text-muted dark:text-gray-300">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
