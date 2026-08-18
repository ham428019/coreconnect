import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '../lib/api';
import { getFallbackProducts } from '../lib/fallbackData';
import ProductCard from '../components/product/ProductCard';
import type { Product } from '../types';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const { data, isLoading } = useQuery({
    queryKey: ['search', query],
    queryFn: () => api.get<{ products: Product[] }>(`/products/search?q=${encodeURIComponent(query)}`),
    enabled: !!query,
    retry: false,
  });

  const fallbackProducts = query ? getFallbackProducts(undefined, query) : [];
  const products = data?.data?.products?.length ? data.data.products : fallbackProducts;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">
          {query ? `Search results for "${query}"` : 'Search'}
        </h1>
        {query && !isLoading && (
          <p className="text-text-muted mt-1">{products.length} results found</p>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card"><div className="skeleton aspect-square rounded-lg mb-3" /><div className="skeleton h-4 w-3/4" /></div>
          ))}
        </div>
      ) : products.length === 0 && query ? (
        <div className="text-center py-16">
          <Search size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold mb-2">No results found</h3>
          <p className="text-text-muted">Try adjusting your search terms or browse categories.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
