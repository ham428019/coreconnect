import { Link } from 'react-router-dom';
import { Star, ShoppingCart, Heart } from 'lucide-react';
import { formatCurrency } from '../../lib/api';
import type { Product } from '../../types';

interface Props {
  product: Product;
  variant?: 'grid' | 'list';
}

export default function ProductCard({ product, variant = 'grid' }: Props) {
  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

  const stockStatus = product.stockQty === 0 ? 'Out of Stock'
    : product.stockQty <= product.lowStockThreshold ? 'Low Stock' : 'In Stock';

  if (variant === 'list') {
    return (
      <Link to={`/product/${product.slug}`} className="card flex gap-4 hover:shadow-md transition-shadow group">
        <div className="w-48 h-48 flex-shrink-0 bg-bg dark:bg-gray-700 rounded-lg border border-border flex items-center justify-center">
          <img src={product.images?.[0]?.url || '/placeholder/product-1.jpg'} alt={product.name} className="max-w-full max-h-full object-contain p-4" />
        </div>
        <div className="flex-1 py-2">
          <p className="text-xs text-text-muted uppercase tracking-widest font-semibold">{product.brand?.name || product.category?.name}</p>
          <h3 className="font-display font-semibold text-lg group-hover:text-accent transition-colors">{product.name}</h3>
          <p className="text-sm text-text-muted mt-1 line-clamp-2">{product.shortDescription}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-2xl font-bold text-accent">{formatCurrency(product.price)}</span>
            {product.comparePrice && (
              <span className="text-sm line-through text-text-muted">{formatCurrency(product.comparePrice)}</span>
            )}
            {discount > 0 && <span className="badge badge-danger">{discount}% OFF</span>}
          </div>
          <p className={`text-xs mt-1 ${product.stockQty === 0 ? 'text-danger' : product.stockQty <= product.lowStockThreshold ? 'text-warning' : 'text-success'}`}>
            {stockStatus}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/product/${product.slug}`} className="card group hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden">
      <div className="relative aspect-square bg-bg dark:bg-gray-700 rounded-lg border border-border overflow-hidden mb-3">
        <img
          src={product.images?.[0]?.url || '/placeholder/product-1.jpg'}
          alt={product.name}
          className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
        />
        {discount > 0 && (
          <span className="absolute top-2 left-2 badge badge-danger">{discount}% OFF</span>
        )}
        <button
          className="absolute top-2 right-2 p-2 bg-bg-card/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent hover:text-white border border-border"
          onClick={(e) => { e.preventDefault(); }}
        >
          <Heart size={16} />
        </button>
      </div>

      <p className="text-xs text-text-muted uppercase tracking-widest font-semibold">{product.brand?.name || product.category?.name}</p>
      <h3 className="font-display font-semibold text-sm mt-1 group-hover:text-accent transition-colors line-clamp-2">{product.name}</h3>

      <div className="mt-auto pt-2">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-accent">{formatCurrency(product.price)}</span>
          {product.comparePrice && (
            <span className="text-xs line-through text-text-muted">{formatCurrency(product.comparePrice)}</span>
          )}
        </div>
        <p className={`text-xs mt-1 ${product.stockQty === 0 ? 'text-danger' : product.stockQty <= product.lowStockThreshold ? 'text-warning' : 'text-success'}`}>
          {stockStatus}
        </p>
        <button
          className="btn-primary w-full mt-3 text-sm !py-2"
          onClick={(e) => { e.preventDefault(); }}
        >
          <ShoppingCart size={14} /> Add to Cart
        </button>
      </div>
    </Link>
  );
}