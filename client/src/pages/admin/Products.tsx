import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Search, ImagePlus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, formatCurrency } from '../../lib/api';
import type { Brand, Category, Product } from '../../types';
import PageHeader from '../../components/layout/PageHeader';

const emptyForm = {
  name: '',
  shortDescription: '',
  price: '',
  stockQty: '',
  description: '',
  categoryId: '',
  brandId: '',
  productType: '',
  tags: '',
  keyFeatures: '',
  warranty: '',
  compatibility: '',
  useCases: '',
  colors: '',
  dimensions: '',
  weight: '',
  specs: '',
};

const commaList = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);

const parseSpecs = (value: string): Record<string, string> => Object.fromEntries(
  value.split('\n').map(line => {
    const separator = line.indexOf(':');
    return separator > 0
      ? [line.slice(0, separator).trim(), line.slice(separator + 1).trim()]
      : ['', ''];
  }).filter(([key, val]) => key && val),
);

export default function AdminProducts() {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'products'],
    queryFn: () => api.get<{ products: Product[] }>('/products?limit=1000'),
  });

  const { data: optionData } = useQuery({
    queryKey: ['product-options'],
    queryFn: () => api.get<{ categories: Category[]; brands: Brand[] }>('/products/meta/options'),
  });

  const createProduct = useMutation({
    mutationFn: async () => {
      let uploaded: { url: string }[] = [];
      if (imageFiles.length > 0) {
        setUploading(true);
        try {
          const fd = new FormData();
          imageFiles.forEach(f => fd.append('images', f));
          const res: any = await api.upload('/uploads', fd);
          uploaded = res.data.images;
        } finally {
          setUploading(false);
        }
      }
      return api.post('/products/admin', {
        name: form.name,
        shortDescription: form.shortDescription,
        price: parseFloat(form.price),
        stockQty: parseInt(form.stockQty),
        description: form.description,
        categoryId: form.categoryId,
        brandId: form.brandId || null,
        productType: form.productType,
        tags: commaList(form.tags),
        keyFeatures: commaList(form.keyFeatures),
        warranty: form.warranty,
        compatibility: commaList(form.compatibility),
        useCases: commaList(form.useCases),
        colors: commaList(form.colors),
        dimensions: form.dimensions,
        weight: form.weight ? parseFloat(form.weight) : null,
        specs: parseSpecs(form.specs),
        images: uploaded.length > 0 ? uploaded.map(u => ({ url: u.url, altText: form.name })) : undefined,
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }); setShowForm(false); setImageFiles([]); toast.success('Product created'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateProduct = useMutation({
    mutationFn: () => api.patch(`/products/admin/${editingProduct?.id}`, {
      name: form.name,
      shortDescription: form.shortDescription,
      price: parseFloat(form.price),
      stockQty: parseInt(form.stockQty),
      description: form.description,
      categoryId: form.categoryId,
      brandId: form.brandId || null,
      productType: form.productType,
      tags: commaList(form.tags),
      keyFeatures: commaList(form.keyFeatures),
      warranty: form.warranty,
      compatibility: commaList(form.compatibility),
      useCases: commaList(form.useCases),
      colors: commaList(form.colors),
      dimensions: form.dimensions,
      weight: form.weight ? parseFloat(form.weight) : null,
      specs: parseSpecs(form.specs),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }); setShowForm(false); setEditingProduct(null); toast.success('Product updated'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.delete(`/products/admin/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }); toast.success('Product deleted'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      shortDescription: product.shortDescription || '',
      price: String(product.price),
      stockQty: String(product.stockQty),
      description: product.description || '',
      categoryId: product.category?.id || '',
      brandId: product.brand?.id || '',
      productType: product.productType || '',
      tags: (product.tags || []).join(', '),
      keyFeatures: (product.keyFeatures || []).join(', '),
      warranty: product.warranty || '',
      compatibility: (product.compatibility || []).join(', '),
      useCases: (product.useCases || []).join(', '),
      colors: (product.colors || []).join(', '),
      dimensions: product.dimensions || '',
      weight: product.weight != null ? String(product.weight) : '',
      specs: Object.entries(product.specs || {}).map(([key, value]) => `${key}: ${value}`).join('\n'),
    });
    setImageFiles([]);
    setShowForm(true);
  };

  const products = data?.data?.products || [];
  const categories = optionData?.data?.categories || [];
  const brands = optionData?.data?.brands || [];

  return (
    <div>
      <PageHeader
        title={`Products (${data?.meta?.total ?? products.length})`}
        subtitle="Manage the product catalog"
        actions={
          <button onClick={() => { setEditingProduct(null); setForm(emptyForm); setShowForm(!showForm); }} className="btn-primary text-sm">
            <Plus size={16} /> Add Product
          </button>
        }
      />

      {showForm && (
        <div className="card mb-6">
          <h3 className="font-semibold mb-4">{editingProduct ? 'Edit Product' : 'New Product'}</h3>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm font-medium">Product name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Product name" className="input mt-1 !py-2" /></label>
              <label className="text-sm font-medium">Product type<input value={form.productType} onChange={e => setForm({ ...form, productType: e.target.value })} placeholder="e.g. Gaming chair" className="input mt-1 !py-2" /></label>
            </div>
            <label className="block text-sm font-medium">Short description<input value={form.shortDescription} maxLength={255} onChange={e => setForm({ ...form, shortDescription: e.target.value })} placeholder="Concise catalog summary" className="input mt-1 !py-2" /></label>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <label className="text-sm font-medium">Price<input value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0.00" type="number" min="0" step="0.01" className="input mt-1 !py-2" /></label>
              <label className="text-sm font-medium">Stock quantity<input value={form.stockQty} onChange={e => setForm({ ...form, stockQty: e.target.value })} placeholder="0" type="number" min="0" className="input mt-1 !py-2" /></label>
              <label className="text-sm font-medium">Weight (kg)<input value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} placeholder="Optional" type="number" min="0" step="0.01" className="input mt-1 !py-2" /></label>
              <label className="text-sm font-medium">Dimensions<input value={form.dimensions} onChange={e => setForm({ ...form, dimensions: e.target.value })} placeholder="Optional" className="input mt-1 !py-2" /></label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm font-medium">Category<select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} className="input mt-1 !py-2"><option value="">Select category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <label className="text-sm font-medium">Brand<select value={form.brandId} onChange={e => setForm({ ...form, brandId: e.target.value })} className="input mt-1 !py-2"><option value="">No brand</option>{brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
            </div>
            <label className="block text-sm font-medium">Description<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Accurate product description" className="input mt-1 !py-2" rows={4} /></label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm font-medium">Warranty<input value={form.warranty} onChange={e => setForm({ ...form, warranty: e.target.value })} placeholder="Only if verified" className="input mt-1 !py-2" /></label>
              <label className="text-sm font-medium">Colors / variants<input value={form.colors} onChange={e => setForm({ ...form, colors: e.target.value })} placeholder="Comma-separated" className="input mt-1 !py-2" /></label>
              <label className="text-sm font-medium">Compatibility<input value={form.compatibility} onChange={e => setForm({ ...form, compatibility: e.target.value })} placeholder="Comma-separated" className="input mt-1 !py-2" /></label>
              <label className="text-sm font-medium">Use cases<input value={form.useCases} onChange={e => setForm({ ...form, useCases: e.target.value })} placeholder="Gaming, Office, Programming" className="input mt-1 !py-2" /></label>
            </div>
            <label className="block text-sm font-medium">Key features<input value={form.keyFeatures} onChange={e => setForm({ ...form, keyFeatures: e.target.value })} placeholder="Comma-separated verified features" className="input mt-1 !py-2" /></label>
            <label className="block text-sm font-medium">Tags<input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="Comma-separated search tags" className="input mt-1 !py-2" /></label>
            <label className="block text-sm font-medium">Specifications <span className="font-normal text-text-muted">(one “name: value” pair per line)</span><textarea value={form.specs} onChange={e => setForm({ ...form, specs: e.target.value })} placeholder={'foam: Cold-cure\nwarranty: 5 years'} className="input mt-1 font-mono text-sm !py-2" rows={5} /></label>
            <div>
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border dark:border-gray-600 rounded-btn py-4 cursor-pointer text-sm text-text-muted hover:border-accent hover:text-accent transition-colors">
                <ImagePlus size={18} />
                {imageFiles.length > 0 ? `${imageFiles.length} image(s) selected` : 'Add product images (jpg, png, webp, gif, avif)'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) setImageFiles(prev => [...prev, ...files].slice(0, 5));
                    e.target.value = '';
                  }}
                />
              </label>
              {imageFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {imageFiles.map((f, idx) => (
                    <div key={`${f.name}-${idx}`} className="relative">
                      <img src={URL.createObjectURL(f)} alt={f.name} className="w-16 h-16 object-cover rounded border border-border dark:border-gray-600" />
                      <button
                        type="button"
                        onClick={() => setImageFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-1.5 -right-1.5 bg-danger text-white rounded-full p-0.5"
                        title="Remove image"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => editingProduct ? updateProduct.mutate() : createProduct.mutate()} disabled={createProduct.isPending || updateProduct.isPending || uploading} className="btn-primary text-sm">
                {uploading ? <Loader2 size={16} className="animate-spin" /> : null} {editingProduct ? 'Update Product' : 'Create Product'}
              </button>
              <button onClick={() => { setShowForm(false); setEditingProduct(null); setImageFiles([]); }} className="btn-ghost text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="text-left py-3 font-medium">Product</th>
                <th className="text-left py-3 font-medium">Category</th>
                <th className="text-right py-3 font-medium">Price</th>
                <th className="text-right py-3 font-medium">Stock</th>
                <th className="text-right py-3 font-medium">Status</th>
                <th className="text-right py-3 font-medium">Actions</th>
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
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-text-muted">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 text-text-muted">{product.category?.name}</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(product.price)}</td>
                  <td className="py-2 text-right">{product.stockQty}</td>
                  <td className="py-2 text-right">
                    {product.isActive ? <span className="badge badge-success">Active</span> : <span className="badge badge-danger">Inactive</span>}
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(product)} className="p-1 hover:bg-gray-100 rounded"><Edit size={14} /></button>
                      <button onClick={() => { if (window.confirm(`Delete product "${product.name}"?`)) deleteProduct.mutate(product.id); }} className="p-1 hover:bg-gray-100 rounded text-danger"><Trash2 size={14} /></button>
                    </div>
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
