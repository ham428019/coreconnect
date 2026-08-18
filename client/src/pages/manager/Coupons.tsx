import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import type { Coupon } from '../../types';
import PageHeader from '../../components/layout/PageHeader';

export default function ManagerCoupons() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', discountType: 'PERCENTAGE', discountValue: '', minOrderAmount: '', usageLimit: '' });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: () => api.get<{ coupons: Coupon[] }>('/coupons'),
  });

  const createCoupon = useMutation({
    mutationFn: () => api.post('/coupons', form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['coupons'] }); setShowForm(false); toast.success('Coupon created'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteCoupon = useMutation({
    mutationFn: (id: string) => api.delete(`/coupons/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['coupons'] }); toast.success('Coupon deleted'); },
  });

  const coupons = data?.data?.coupons || [];

  return (
    <div>
      <PageHeader
        title="Coupon Management"
        subtitle="Create and manage discount codes"
        actions={
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
            <Plus size={16} /> Create Coupon
          </button>
        }
      />

      {showForm && (
        <div className="card mb-6">
          <h3 className="font-semibold mb-4">New Coupon</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="Coupon Code" className="input !py-2" />
              <select value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value })} className="input !py-2">
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED_AMOUNT">Fixed Amount</option>
                <option value="FREE_SHIPPING">Free Shipping</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input value={form.discountValue} onChange={e => setForm({ ...form, discountValue: e.target.value })} placeholder="Discount Value" type="number" className="input !py-2" />
              <input value={form.minOrderAmount} onChange={e => setForm({ ...form, minOrderAmount: e.target.value })} placeholder="Min Order $" type="number" className="input !py-2" />
              <input value={form.usageLimit} onChange={e => setForm({ ...form, usageLimit: e.target.value })} placeholder="Usage Limit" type="number" className="input !py-2" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => createCoupon.mutate()} className="btn-primary text-sm">Create</button>
              <button onClick={() => setShowForm(false)} className="btn-ghost text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <p className="text-text-muted">Loading...</p>
        ) : coupons.map((coupon) => (
          <div key={coupon.id} className="card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Ticket size={24} className="text-accent" />
              <div>
                <p className="font-semibold">{coupon.code}</p>
                <p className="text-xs text-text-muted">
                  {coupon.discountType === 'PERCENTAGE' ? `${Number(coupon.discountValue)}% off` :
                   coupon.discountType === 'FIXED_AMOUNT' ? `$${coupon.discountValue} off` : 'Free Shipping'}
                </p>
              </div>
            </div>
            <button onClick={() => deleteCoupon.mutate(coupon.id)} className="p-1.5 hover:bg-red-50 rounded text-danger">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
