import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api, formatCurrency } from '../../lib/api';
import type { Product } from '../../types';
import { useState } from 'react';
import PageHeader from '../../components/layout/PageHeader';

export default function EmployeeProducts() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['employee', 'products', search],
    queryFn: () => api.get<{ products: Product[] }>(`/products?limit=100&search=${search}`),
  });

  const products = data?.data?.products || [];

  return (
    <div>
      <PageHeader title="Product Catalog" subtitle={`${products.length} products available`} />

      <div className="relative mb-4 max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="input !pl-10 !py-2"
        />
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="text-left py-3 font-medium">Product</th>
                <th className="text-left py-3 font-medium">SKU</th>
                <th className="text-left py-3 font-medium">Category</th>
                <th className="text-right py-3 font-medium">Price</th>
                <th className="text-right py-3 font-medium">Stock</th>
                <th className="text-right py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="py-8 text-center text-text-muted">Loading...</td></tr>
              ) : products.map((product) => (
                <tr key={product.id} className="border-b border-border hover:bg-gray-50">
                  <td className="py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                        <img src={product.images?.[0]?.url || '/placeholder/product-1.jpg'} alt="" className="w-8 h-8 object-contain" />
                      </div>
                      <p className="font-medium">{product.name}</p>
                    </div>
                  </td>
                  <td className="py-2 text-text-muted text-xs">{product.sku}</td>
                  <td className="py-2 text-text-muted">{product.category?.name}</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(product.price)}</td>
                  <td className="py-2 text-right">
                    <span className={product.stockQty === 0 ? 'text-danger' : product.stockQty <= (product.lowStockThreshold || 10) ? 'text-warning' : ''}>
                      {product.stockQty}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    {product.isActive ? <span className="badge badge-success">Active</span> : <span className="badge badge-danger">Inactive</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
