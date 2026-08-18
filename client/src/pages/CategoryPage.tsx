import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ProductGrid from '../components/product/ProductGrid';
import type { Category } from '../types';
import { api } from '../lib/api';

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data } = useQuery({
    queryKey: ['category', slug],
    queryFn: () => api.get<{ category: Category }>(`/categories/${slug}`),
    enabled: !!slug,
  });

  const category = data?.data?.category;

  return (
    <div>
      <div className="mb-8">
        <div className="text-sm text-text-muted mb-1">
          <a href="/" className="hover:text-accent">Home</a> / <span className="text-text">{category?.name || slug}</span>
        </div>
        <h1 className="font-display text-3xl font-bold">{category?.name || 'Products'}</h1>
        {category?.description && <p className="text-text-muted mt-2">{category.description}</p>}
      </div>
      <ProductGrid categorySlug={slug} />
    </div>
  );
}
