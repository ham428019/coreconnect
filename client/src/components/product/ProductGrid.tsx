import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, Grid3X3, List, ChevronLeft, ChevronRight, FilterX } from 'lucide-react';
import { api } from '../../lib/api';
import { getFallbackProducts, getFallbackCategories } from '../../lib/fallbackData';
import ProductCard from './ProductCard';
import type { Product, Category } from '../../types';

export default function ProductGrid({ categorySlug }: { categorySlug?: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryCategory = searchParams.get('category') || '';
  const category = categorySlug || queryCategory;
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sort, setSort] = useState('newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [appliedMin, setAppliedMin] = useState('');
  const [appliedMax, setAppliedMax] = useState('');
  const [page, setPage] = useState(1);

  const commitFilters = () => {
    setAppliedMin(minPrice.trim());
    setAppliedMax(maxPrice.trim());
  };

  const commitOnKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitFilters();
  };

  const clearFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setAppliedMin('');
    setAppliedMax('');
    setSort('newest');
    setPage(1);
    if (!categorySlug) setSearchParams({});
  };

  useEffect(() => {
    setPage(1);
  }, [category, sort, appliedMin, appliedMax]);

  const queryString = new URLSearchParams({ limit: '20', sort, page: String(page) });
  if (category) queryString.set('category', category);
  if (appliedMin) queryString.set('minPrice', appliedMin);
  if (appliedMax) queryString.set('maxPrice', appliedMax);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['products', queryString.toString()],
    queryFn: () => api.get<{ products: Product[] }>(`/products?${queryString.toString()}`),
    retry: false,
  });

  const { data: catData, isError: catErr } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ categories: Category[] }>('/categories'),
    retry: false,
  });

  const fallbackProducts = getFallbackProducts(category || undefined);
  const apiProducts = data?.data?.products;
  const products = apiProducts?.length ? apiProducts : (isError ? fallbackProducts : []);
  const categories = catData?.data?.categories?.length ? catData.data.categories : (catErr ? getFallbackCategories() : []);

  const totalPages = data?.meta?.totalPages || 1;
  const currentPage = data?.meta?.page || page;

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="card">
            <div className="skeleton aspect-square rounded-lg mb-3" />
            <div className="skeleton h-3 w-20 mb-2" />
            <div className="skeleton h-4 w-full mb-1" />
            <div className="skeleton h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          {!categorySlug && (
            <select
              value={queryCategory}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams);
                if (e.target.value) params.set('category', e.target.value);
                else params.delete('category');
                setSearchParams(params);
              }}
              className="input !w-auto !py-2"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.slug} value={cat.slug}>{cat.name}</option>
              ))}
            </select>
          )}
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input !w-auto !py-2">
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name_asc">Name: A-Z</option>
          </select>
          <button onClick={() => setView(view === 'grid' ? 'list' : 'grid')} className="btn-ghost !px-2" aria-label="Toggle view">
            {view === 'grid' ? <List size={18} /> : <Grid3X3 size={18} />}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input type="number" placeholder="Min $" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} onBlur={commitFilters} onKeyDown={commitOnKey} className="input !w-24 !py-2 text-sm" />
          <span className="text-text-muted">-</span>
          <input type="number" placeholder="Max $" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} onBlur={commitFilters} onKeyDown={commitOnKey} className="input !w-24 !py-2 text-sm" />
          <button onClick={clearFilters} className="btn-ghost !px-2" aria-label="Clear filters" title="Clear filters">
            <FilterX size={18} />
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16">
          <SlidersHorizontal size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold mb-2">No products found</h3>
          <p className="text-text-muted">Try adjusting your filters or search terms.</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} variant="list" />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
          <p className="text-sm text-text-muted">
            Showing {products.length} of {data?.meta?.total} products
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="w-8 h-8 rounded-btn border border-border bg-white hover:bg-gray-50 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => goToPage(i + 1)}
                className={`w-8 h-8 rounded-btn text-sm font-medium ${
                  i + 1 === currentPage ? 'bg-accent text-white' : 'bg-white border border-border hover:bg-gray-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="w-8 h-8 rounded-btn border border-border bg-white hover:bg-gray-50 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
