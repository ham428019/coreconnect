import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, formatCurrency, getOrderStatusBadge } from '../../lib/api';
import type { Order } from '../../types';
import PageHeader from '../../components/layout/PageHeader';

export default function AdminOrders() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: () => api.get<{ orders: Order[] }>('/orders/admin/all?limit=1000'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/orders/admin/${id}/status`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] }); toast.success('Order updated'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const orders = data?.data?.orders || [];

  const statusFlow: Record<string, string[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED'],
    DELIVERED: ['RETURNED'],
  };

  return (
    <div>
      <PageHeader title="Orders Management" subtitle={`${orders.length} orders in total`} />

      <div className="grid grid-cols-6 gap-4 mb-6">
        {['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(s => (
          <div key={s} className="card text-center">
            <p className="text-2xl font-bold">{orders.filter(o => o.status === s).length}</p>
            <p className={`text-xs font-medium mt-1 ${getOrderStatusBadge(s).replace('badge-', 'text-')}`}>{s}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="text-left py-3 font-medium">Order #</th>
                <th className="text-left py-3 font-medium">Customer</th>
                <th className="text-left py-3 font-medium">Date</th>
                <th className="text-right py-3 font-medium">Total</th>
                <th className="text-center py-3 font-medium">Status</th>
                <th className="text-right py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="py-8 text-center text-text-muted">Loading...</td></tr>
              ) : orders.map((order) => (
                <tr key={order.id} className="border-b border-border hover:bg-gray-50">
                  <td className="py-2 font-medium">{order.orderNumber}</td>
                  <td className="py-2 text-text-muted">{order.user?.firstName} {order.user?.lastName}</td>
                  <td className="py-2 text-text-muted">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(order.totalAmount)}</td>
                  <td className="py-2 text-center">
                    <span className={`badge ${getOrderStatusBadge(order.status)}`}>{order.status}</span>
                  </td>
                  <td className="py-2 text-right">
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) updateStatus.mutate({ id: order.id, status: e.target.value });
                      }}
                      className="text-xs border border-border dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-text dark:text-white"
                    >
                      <option value="">Update</option>
                      {(statusFlow[order.status] || []).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
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
