import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import type { User } from '../../types';
import PageHeader from '../../components/layout/PageHeader';

export default function AdminUsers() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get<{ users: User[] }>('/users/admin/users'),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch(`/users/admin/users/${id}/role`, { role }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success('Role updated'); },
  });

  const users = data?.data?.users || [];

  return (
    <div>
      <PageHeader title="Users Management" subtitle="Manage accounts and roles" />

      <div className="grid grid-cols-4 gap-4 mb-6">
        {['CUSTOMER', 'EMPLOYEE', 'MANAGER', 'ADMIN'].map(role => (
          <div key={role} className="card text-center">
            <p className="text-2xl font-bold">{users.filter(u => u.role === role).length}</p>
            <p className="text-xs text-text-muted mt-1">{role.replace('_', ' ')}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-muted">
              <th className="text-left py-3 font-medium">User</th>
              <th className="text-left py-3 font-medium">Email</th>
              <th className="text-center py-3 font-medium">Role</th>
              <th className="text-center py-3 font-medium">Status</th>
              <th className="text-right py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="py-8 text-center text-text-muted">Loading...</td></tr>
            ) : users.map((user) => (
              <tr key={user.id} className="border-b border-border hover:bg-gray-50">
                <td className="py-2 font-medium">{user.firstName} {user.lastName}</td>
                <td className="py-2 text-text-muted">{user.email}</td>
                <td className="py-2 text-center">
                  <select
                    value={user.role}
                    onChange={(e) => updateRole.mutate({ id: user.id, role: e.target.value })}
                    className="text-xs border border-border dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-text dark:text-white"
                  >
                    <option value="CUSTOMER">Customer</option>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </td>
                <td className="py-2 text-center">
                  {user.isActive ? <span className="badge badge-success">Active</span> : <span className="badge badge-danger">Inactive</span>}
                </td>
                <td className="py-2 text-right text-text-muted">{new Date(user.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
