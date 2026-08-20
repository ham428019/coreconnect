import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Clock, PackageCheck, Truck, DollarSign } from 'lucide-react';
import { api, formatCurrency, getOrderStatusBadge } from '../../lib/api';
import type { Order } from '../../types';
import PageHeader from '../../components/layout/PageHeader';
import DashboardTitleBar from '../../components/layout/DashboardTitleBar';

export default function EmployeeDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['employee', 'orders'],
    queryFn: () => api.get<{ orders: Order[] }>('/orders/admin/all?limit=1000'),
  });

  const orders = data?.data?.orders || [];
  const revenue = orders
    .filter(o => !['CANCELLED', 'RETURNED', 'REFUNDED'].includes(o.status))
    .reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const pending = orders.filter(o => o.status === 'PENDING' || o.status === 'CONFIRMED').length;
  const shipped = orders.filter(o => o.status === 'SHIPPED').length;
  const delivered = orders.filter(o => o.status === 'DELIVERED').length;
  const recent = orders.slice(0, 8);

  const stats = [
    { label: 'Total Revenue', value: formatCurrency(revenue), icon: DollarSign, color: 'bg-green-500' },
    { label: 'Pending Orders', value: pending, icon: Clock, color: 'bg-yellow-500' },
    { label: 'Shipped', value: shipped, icon: Truck, color: 'bg-blue-500' },
    { label: 'Delivered', value: delivered, icon: PackageCheck, color: 'bg-purple-500' },
  ];

  return (
    <div>
      <DashboardTitleBar title="Employee Dashboard" />
      <PageHeader subtitle="Your tasks at a glance" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg text-white`}>
                <stat.icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag size={18} className="text-accent" />
          <h3 className="font-semibold">Recent Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="text-left py-3 font-medium">Order #</th>
                <th className="text-left py-3 font-medium">Customer</th>
                <th className="text-left py-3 font-medium">Date</th>
                <th className="text-right py-3 font-medium">Total</th>
                <th className="text-center py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="py-8 text-center text-text-muted">Loading...</td></tr>
              ) : recent.map((order) => (
                <tr key={order.id} className="border-b border-border">
                  <td className="py-2 font-medium">{order.orderNumber}</td>
                  <td className="py-2 text-text-muted">{order.user?.firstName} {order.user?.lastName}</td>
                  <td className="py-2 text-text-muted">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(order.totalAmount)}</td>
                  <td className="py-2 text-center">
                    <span className={`badge ${getOrderStatusBadge(order.status)}`}>{order.status}</span>
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
