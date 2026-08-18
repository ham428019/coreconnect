import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { api } from '../../lib/api';
import PageHeader from '../../components/layout/PageHeader';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function AdminAnalytics() {
  const { data } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => api.get('/analytics/overview'),
  });

  const { data: topData } = useQuery({
    queryKey: ['admin', 'top-products'],
    queryFn: () => api.get('/analytics/top-products'),
  });

  const analytics = (data?.data || {}) as any;
  const topProducts = (topData?.data as any)?.products || [];
  const orderStatusData = (analytics?.ordersByStatus || []).map((o: any) => ({ name: o.status, value: o.count }));
  const monthlyRevenue = (analytics?.monthlyRevenue || []).map((m: any) => ({
    month: new Date(m.month).toLocaleString('en-US', { month: 'short', year: 'numeric' }),
    revenue: Number(m.revenue),
  }));

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Store performance insights" />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-4">Orders by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={orderStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {orderStatusData.map((_: any, idx: number) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4">Monthly Revenue</h3>
          {monthlyRevenue.length === 0 ? (
            <p className="text-sm text-text-muted">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4">Top Products by Orders</h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-text-muted">No data yet</p>
          ) : (
            <div className="space-y-3">
              {topProducts.slice(0, 10).map((p: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-text-muted w-6">#{idx + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <div className="h-1.5 bg-gray-200 rounded-full mt-1">
                      <div
                        className="h-1.5 bg-accent rounded-full"
                        style={{ width: `${(p.orders / (topProducts[0]?.orders || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-text-muted">{p.orders} orders</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
