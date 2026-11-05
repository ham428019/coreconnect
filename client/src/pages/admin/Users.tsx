import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import type { User } from '../../types';
import PageHeader from '../../components/layout/PageHeader';

const PERMISSIONS = ['products.create', 'products.edit', 'products.delete', 'inventory.update', 'orders.view', 'orders.update', 'coupons.manage', 'analytics.view'];
const ROLES = ['CUSTOMER', 'EMPLOYEE', 'MANAGER', 'ADMIN'];

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get<{ users: User[] }>('/users/admin/users?limit=1000'),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch(`/users/admin/users/${id}/role`, { role }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success('Role updated'); },
  });

  const [editing, setEditing] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const savePermissions = useMutation({ mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) => api.patch(`/users/admin/users/${id}/permissions`, { permissions }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); setEditing(null); toast.success('Permissions saved'); }, onError: () => toast.error('Unable to save permissions') });
  const users = data?.data?.users || [];
  const filteredUsers = roleFilter === 'ALL' ? users : users.filter(u => u.role === roleFilter);

  return (
    <div>
      <PageHeader title="Users Management" subtitle={`${filteredUsers.length} ${roleFilter === 'ALL' ? 'users in total' : roleFilter.toLowerCase().replace('_', ' ') + 's'}`} />

      <div className="flex flex-wrap gap-2 mb-6">
        {['ALL', ...ROLES].map(r => {
          const active = roleFilter === r;
          const count = r === 'ALL' ? users.length : users.filter(u => u.role === r).length;
          return (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-4 py-2 rounded-btn text-sm font-medium border transition-colors ${active ? 'bg-accent border-accent text-white hover:bg-accent-hover' : 'bg-bg-card dark:bg-gray-800 border-border dark:border-gray-600 text-text dark:text-white hover:bg-bg dark:hover:bg-gray-700'}`}
            >
              {r === 'ALL' ? 'All' : r.replace('_', ' ').toLowerCase()} <span className={`ml-1 text-xs ${active ? 'text-white/80' : 'text-text-muted dark:text-gray-400'}`}>({count})</span>
            </button>
          );
        })}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-border text-text-muted">
              <th className="text-left py-3 font-medium">User</th>
              <th className="text-left py-3 font-medium">Email</th>
              <th className="text-center py-3 font-medium">Role</th>
              <th className="text-center py-3 font-medium">Status</th>
              <th className="text-right py-3 font-medium">Joined</th><th className="text-center py-3 font-medium">Permissions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="py-8 text-center text-text-muted">Loading...</td></tr>
            ) : filteredUsers.map((user) => (
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
                <td className="py-2 text-right text-text-muted">{new Date(user.createdAt).toLocaleDateString()}</td><td className="py-2 text-center">{user.role === 'MANAGER' && <button className="text-accent underline" onClick={() => { setEditing(user.id); setSelected((user as User & {managerPermissions?: string[]}).managerPermissions || []); }}>Manage</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <div className="card mt-6 p-5"><h3 className="font-semibold mb-3">Manager permissions</h3><div className="grid gap-3 sm:grid-cols-2">{PERMISSIONS.map(p => <label key={p} className="flex gap-2 items-center"><input type="checkbox" checked={selected.includes(p)} onChange={e => setSelected(prev => e.target.checked ? [...prev, p] : prev.filter(x => x !== p))}/>{p}</label>)}</div><p className="text-xs text-text-muted mt-3">Customer account management is permanently Admin-only.</p><div className="flex gap-3 mt-4"><button className="btn btn-primary" disabled={savePermissions.isPending} onClick={() => savePermissions.mutate({id: editing, permissions: selected})}>Save permissions</button><button onClick={() => setEditing(null)}>Cancel</button></div></div>}
    </div>
  );
}
