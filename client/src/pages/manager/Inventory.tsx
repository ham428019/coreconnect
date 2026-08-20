import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Search } from 'lucide-react';
import { api, formatCurrency } from '../../lib/api';
import type { Product } from '../../types';
import { useState } from 'react';
import PageHeader from '../../components/layout/PageHeader';

export default function ManagerInventory() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'products', search],
    queryFn: () => api.get<{ products: Product[] }>(`/products?limit=1000&search=${search}`),
  });

  const updateStock = useMutation({
    mutationFn: ({ id, stockQty }: { id: string; stockQty: number }) =>
      api.patch(`/products/admin/${id}`, { stockQty }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }); toast.success('Stock updated'); },
  });

  const products = data?.data?.products || [];
  const lowStock = products.filter(p => p.stockQty <= p.lowStockThreshold && p.stockQty > 0);
  const outOfStock = products.filter(p => p.stockQty === 0);
  const filtered = products.filter(p => {
    if (status === 'low') return p.stockQty > 0 && p.stockQty <= p.lowStockThreshold;
    if (status === 'out') return p.stockQty === 0;
    if (status === 'in') return p.stockQty > p.lowStockThreshold;
    return true;
  });

  return (
    <div>
      <PageHeader title="Inventory Management" subtitle={`${data?.meta?.total ?? products.length} products in stock`} />

      {(lowStock.length > 0 || outOfStock.length > 0) && (
        <div className="card mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-warning dark:border-yellow-700">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-warning" />
            <div>
              <p className="font-medium">{lowStock.length} products low on stock</p>
              <p className="text-sm text-text-muted">{outOfStock.length} products out of stock</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search inventory..."
            className="input !pl-10 !py-2"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by stock status"
          className="input !py-2 w-44"
        >
          <option value="all">All statuses</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
          <option value="in">In stock</option>
        </select>
      </div>

      <div className="card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-muted">
              <th className="text-left py-3 font-medium">Product</th>
              <th className="text-left py-3 font-medium">SKU</th>
              <th className="text-right py-3 font-medium">Price</th>
              <th className="text-right py-3 font-medium">In Stock</th>
              <th className="text-center py-3 font-medium">Status</th>
              <th className="text-right py-3 font-medium">Update</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="py-8 text-center text-text-muted">Loading...</td></tr>
            ) : filtered.map((product) => (
              <tr key={product.id} className="border-b border-border hover:bg-gray-50">
                <td className="py-2 font-medium">{product.name}</td>
                <td className="py-2 text-text-muted text-xs">{product.sku}</td>
                <td className="py-2 text-right">{formatCurrency(product.price)}</td>
                <td className="py-2 text-right font-medium">
                  <span className={product.stockQty === 0 ? 'text-danger' : product.stockQty <= product.lowStockThreshold ? 'text-warning' : ''}>
                    {product.stockQty}
                  </span>
                </td>
                <td className="py-2 text-center">
                  {product.stockQty === 0 ? (
                    <span className="badge badge-danger">Out</span>
                  ) : product.stockQty <= product.lowStockThreshold ? (
                    <span className="badge badge-warning">Low</span>
                  ) : (
                    <span className="badge badge-success">OK</span>
                  )}
                </td>
                <td className="py-2 text-right">
                  <input
                    type="number"
                    defaultValue={product.stockQty}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value);
                      if (!isNaN(v)) updateStock.mutate({ id: product.id, stockQty: v });
                    }}
                    className="w-20 text-center border border-border dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 text-text dark:text-white"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
