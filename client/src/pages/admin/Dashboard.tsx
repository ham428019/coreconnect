import { useQuery } from '@tanstack/react-query';
import { DollarSign, ShoppingBag, Users, Package, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { api, formatCurrency } from '../../lib/api';
import PageHeader from '../../components/layout/PageHeader';
import DashboardTitleBar from '../../components/layout/DashboardTitleBar';

export default function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ['admin', 'sales'],
    queryFn: () => api.get('/analytics/sales'),
  });

  const analytics = (data?.data || {}) as any;
  const kpi = analytics.kpi || {};

  const stats = [
    { label: 'Total Revenue', value: formatCurrency(kpi.totalRevenue || 0), icon: DollarSign, color: 'bg-green-500' },
    { label: 'Total Orders', value: kpi.totalOrders || 0, icon: ShoppingBag, color: 'bg-blue-500' },
    { label: 'Total Users', value: kpi.totalUsers || 0, icon: Users, color: 'bg-purple-500' },
    { label: 'Products', value: kpi.totalProducts || 0, icon: Package, color: 'bg-orange-500' },
  ];

  const chartData = [
    { month: 'Jan', revenue: 4200, orders: 42 },
    { month: 'Feb', revenue: 3800, orders: 38 },
    { month: 'Mar', revenue: 5100, orders: 51 },
    { month: 'Apr', revenue: 4600, orders: 46 },
    { month: 'May', revenue: 5800, orders: 58 },
    { month: 'Jun', revenue: 6200, orders: 62 },
  ];

  return (
    <div>
      <DashboardTitleBar title="Admin Dashboard" />
      <PageHeader subtitle="Overview of store performance" />

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

      {kpi.lowStockProducts > 0 && (
        <div className="card mb-8 bg-yellow-50 border-warning">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-warning" />
            <p className="font-medium text-sm">{kpi.lowStockProducts} products are running low on stock</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-4">Revenue Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
              <YAxis stroke="#64748B" fontSize={12} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4">Order Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
              <YAxis stroke="#64748B" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card mt-6">
        <h3 className="font-semibold mb-4">Recent Orders</h3>
        {(analytics?.recentOrders || []).length === 0 ? (
          <p className="text-sm text-text-muted">No orders yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="text-left py-2 font-medium">Order #</th>
                <th className="text-left py-2 font-medium">Customer</th>
                <th className="text-left py-2 font-medium">Status</th>
                <th className="text-right py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {(analytics?.recentOrders || []).map((order: any) => (
                <tr key={order.id} className="border-b border-border">
                  <td className="py-2 font-medium">{order.orderNumber}</td>
                  <td className="py-2 text-text-muted">{order.user?.firstName} {order.user?.lastName}</td>
                  <td className="py-2"><span className="badge badge-info">{order.status}</span></td>
                  <td className="py-2 text-right">{formatCurrency(order.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
