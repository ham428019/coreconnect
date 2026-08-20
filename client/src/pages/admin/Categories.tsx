import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import type { Category } from '../../types';
import PageHeader from '../../components/layout/PageHeader';

export default function AdminCategories() {
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => api.get<{ categories: Category[] }>('/categories/all'),
  });

  const createCategory = useMutation({
    mutationFn: () => api.post('/categories', form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }); setShowForm(false); toast.success('Category created'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateCategory = useMutation({
    mutationFn: () => api.patch(`/categories/${editingCategory?.id}`, form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }); setShowForm(false); setEditingCategory(null); toast.success('Category updated'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }); toast.success('Category deactivated'); },
  });

  const categories = data?.data?.categories || [];

  return (
    <div>
      <PageHeader
        title={`Categories (${categories.length})`}
        subtitle="Organize the store catalog"
        actions={
          <button onClick={() => { setEditingCategory(null); setShowForm(!showForm); }} className="btn-primary text-sm">
            <Plus size={16} /> Add Category
          </button>
        }
      />

      {showForm && (
        <div className="card mb-6 flex gap-3 items-center">
          <p className="font-semibold whitespace-nowrap">{editingCategory ? 'Edit' : 'New'}</p>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Category name" className="input !py-2 flex-1" />
          <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" className="input !py-2 flex-1" />
          <button onClick={() => editingCategory ? updateCategory.mutate() : createCategory.mutate()} className="btn-primary text-sm">{editingCategory ? 'Update' : 'Create'}</button>
          <button onClick={() => { setShowForm(false); setEditingCategory(null); }} className="btn-ghost text-sm">Cancel</button>
        </div>
      )}

      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <p className="text-text-muted">Loading...</p>
          ) : categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between p-4 border border-border rounded-card hover:border-accent transition-colors">
              <div>
                <p className="font-medium">{cat.name}</p>
                <p className="text-xs text-text-muted">{cat.slug}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditingCategory(cat); setForm({ name: cat.name, description: cat.description || '' }); setShowForm(true); }} className="p-1.5 hover:bg-gray-100 rounded"><Edit size={14} /></button>
                <button onClick={() => deleteCategory.mutate(cat.id)} className="p-1.5 hover:bg-red-50 rounded text-danger"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
