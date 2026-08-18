import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { User, Mail, Phone, MapPin, Plus, Trash2, Shield } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../stores';
import type { Address } from '../types';

export default function Profile() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [newAddress, setNewAddress] = useState({ label: '', street: '', city: '', state: '', zipCode: '' });

  const { data: addrData } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get<{ addresses: Address[] }>('/users/me/addresses'),
  });

  const updateProfile = useMutation({
    mutationFn: () => api.patch('/users/me', { firstName, lastName, phone }),
    onSuccess: (res: any) => { setUser(res.data.user); setEditing(false); toast.success('Profile updated'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const addAddress = useMutation({
    mutationFn: () => api.post('/users/me/addresses', newAddress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setNewAddress({ label: '', street: '', city: '', state: '', zipCode: '' });
      toast.success('Address added');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteAddress = useMutation({
    mutationFn: (id: string) => api.delete(`/users/me/addresses/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['addresses'] }); toast.success('Address deleted'); },
  });

  const addresses = addrData?.data?.addresses || [];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">My Profile</h1>

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Personal Information</h2>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-ghost text-sm">Edit</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending} className="btn-primary text-sm !py-2">
                Save
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input" placeholder="First Name" />
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="input" placeholder="Last Name" />
            </div>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="Phone number" />
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3"><User size={16} className="text-text-muted" /> <span>{user?.firstName} {user?.lastName}</span></div>
            <div className="flex items-center gap-3"><Mail size={16} className="text-text-muted" /> <span>{user?.email}</span></div>
            {user?.phone && <div className="flex items-center gap-3"><Phone size={16} className="text-text-muted" /> <span>{user?.phone}</span></div>}
            <div className="flex items-center gap-3"><Shield size={16} className="text-text-muted" /> <span className="badge badge-info">{user?.role}</span></div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Saved Addresses</h2>
        </div>
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <MapPin size={18} className="text-accent flex-shrink-0" />
              <div className="flex-1 text-sm">
                <span className="font-medium">{addr.label}: </span>
                <span className="text-text-muted">{addr.street}, {addr.city}, {addr.state} {addr.zipCode}</span>
                {addr.isDefault && <span className="badge badge-success ml-2">Default</span>}
              </div>
              <button onClick={() => deleteAddress.mutate(addr.id)} className="p-1 text-text-muted hover:text-danger transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold mb-3">Add New Address</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={newAddress.label} onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })} placeholder="Label (e.g. Home)" className="input !py-2 text-sm" />
                <input value={newAddress.street} onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })} placeholder="Street Address" className="input !py-2 text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} placeholder="City" className="input !py-2 text-sm" />
                <input value={newAddress.state} onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })} placeholder="State" className="input !py-2 text-sm" />
                <input value={newAddress.zipCode} onChange={(e) => setNewAddress({ ...newAddress, zipCode: e.target.value })} placeholder="ZIP" className="input !py-2 text-sm" />
              </div>
              <button onClick={() => addAddress.mutate()} disabled={!newAddress.label || !newAddress.street} className="btn-outline text-sm">
                <Plus size={16} /> Add Address
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
