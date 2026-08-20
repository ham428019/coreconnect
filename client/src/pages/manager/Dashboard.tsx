import { useQuery } from '@tanstack/react-query';
import { DollarSign, Package, AlertTriangle, ShoppingBag } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api, formatCurrency, formatCurrencyCompact, chartTicks } from '../../lib/api';
import PageHeader from '../../components/layout/PageHeader';
import DashboardTitleBar from '../../components/layout/DashboardTitleBar';
import ChartTooltip from '../../components/charts/ChartTooltip';

export default function ManagerDashboard() {
  const { data } = useQuery({
    queryKey: ['manager', 'analytics'],
    queryFn: () => api.get('/analytics/sales'),
  });

  const { data: ordersData } = useQuery({
    queryKey: ['manager', 'orders'],
    queryFn: () => api.get('/orders/admin/all?limit=1000'),
  });

  const kpi = ((data?.data || {}) as any).kpi || {};

  const sales = ((ordersData?.data as any)?.orders || [])
    .filter((o: any) => !['CANCELLED', 'RETURNED', 'REFUNDED'].includes(o.status));

  const salesByDay = new Map<string, number>();
  for (const o of sales) {
    const d = new Date(o.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    salesByDay.set(key, (salesByDay.get(key) || 0) + Number(o.totalAmount));
  }

  const recentSales = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    return {
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      sales: Math.round((salesByDay.get(key) || 0) * 100) / 100,
    };
  });

  const salesTicks = chartTicks(recentSales.length ? Math.max(...recentSales.map((d) => d.sales)) : 0);

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
            <XAxis dataKey="day" stroke="#64748B" fontSize={12} interval={0} />
            <YAxis stroke="#64748B" fontSize={12} tickFormatter={(v: number) => formatCurrencyCompact(v)} domain={[0, salesTicks.max]} ticks={salesTicks.ticks} />
            <Tooltip content={<ChartTooltip currency />} />
            <Bar dataKey="sales" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
