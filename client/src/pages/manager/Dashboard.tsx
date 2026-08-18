import { useQuery } from '@tanstack/react-query';
import { DollarSign, Package, AlertTriangle, ShoppingBag } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api, formatCurrency } from '../../lib/api';
import PageHeader from '../../components/layout/PageHeader';
import DashboardTitleBar from '../../components/layout/DashboardTitleBar';

export default function ManagerDashboard() {
  const { data } = useQuery({
    queryKey: ['manager', 'analytics'],
    queryFn: () => api.get('/analytics/sales'),
  });

  const kpi = ((data?.data || {}) as any).kpi || {};

  const recentSales = [
    { day: 'Mon', sales: 420 },
    { day: 'Tue', sales: 380 },
    { day: 'Wed', sales: 510 },
    { day: 'Thu', sales: 460 },
    { day: 'Fri', sales: 580 },
    { day: 'Sat', sales: 350 },
    { day: 'Sun', sales: 200 },
  ];

  return (
    <div>
      <DashboardTitleBar title="Manager Dashboard" />
      <PageHeader subtitle="Overview of store performance" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Revenue', value: formatCurrency(kpi.totalRevenue || 0), icon: DollarSign, color: 'bg-green-500' },
          { label: 'Orders', value: kpi.totalOrders || 0, icon: ShoppingBag, color: 'bg-blue-500' },
          { label: 'Products', value: kpi.totalProducts || 0, icon: Package, color: 'bg-orange-500' },
          { label: 'Low Stock', value: kpi.lowStockProducts || 0, icon: AlertTriangle, color: 'bg-red-500' },
        ].map(stat => (
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

      <div className="card mb-6">
        <h3 className="font-semibold mb-4">Weekly Sales</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={recentSales}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="day" stroke="#64748B" fontSize={12} />
            <YAxis stroke="#64748B" fontSize={12} />
            <Tooltip />
            <Bar dataKey="sales" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
