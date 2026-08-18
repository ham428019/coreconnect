import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Mail, Lock, User, UserPlus } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../stores';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export default function Register() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res: any = await api.post('/auth/register', data);
      setUser(res.data.user);
      toast.success('Account created! Welcome to CoreConnect.');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold">Create Account</h1>
          <p className="text-text-muted mt-2">Join CoreConnect and start shopping</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input {...register('firstName')} placeholder="First Name" className="input !pl-10" />
              </div>
              {errors.firstName && <p className="text-danger text-xs mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <input {...register('lastName')} placeholder="Last Name" className="input" />
              {errors.lastName && <p className="text-danger text-xs mt-1">{errors.lastName.message}</p>}
            </div>
          </div>
          <div>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input {...register('email')} type="email" placeholder="Email address" className="input !pl-10" />
            </div>
            {errors.email && <p className="text-danger text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input {...register('password')} type="password" placeholder="Password (min 6 characters)" className="input !pl-10" />
            </div>
            {errors.password && <p className="text-danger text-xs mt-1">{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            <UserPlus size={18} /> {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          <p className="text-center text-sm text-text-muted">
            Already have an account? <Link to="/login" className="text-accent font-medium hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
