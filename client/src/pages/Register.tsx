import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Mail, Lock, User, UserPlus, Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../stores';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email(),
  password: z.string().min(12, 'Password must be at least 12 characters').max(72, 'Password must be at most 72 characters').regex(/[A-Z]/, 'Include at least one uppercase letter').regex(/[a-z]/, 'Include at least one lowercase letter').regex(/[0-9]/, 'Include at least one number').regex(/[^A-Za-z0-9\s]/, 'Include at least one special symbol').refine(value => !['password123', 'password1234', 'password12345', '123456789012', 'qwerty123456', 'admin12345678', 'letmein123456', 'iloveyou12345'].includes(value.toLowerCase()), 'Choose a less common password'),
});

type FormData = z.infer<typeof schema>;

export default function Register() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      toast.error(err.message === 'Validation error' ? 'Please check your details and choose a stronger password.' : (err.message || 'Unable to create account. Please try again.'));
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
              <input {...register('password')} type={showPassword ? "text" : "password"} placeholder="Create a strong password" className="input !pl-10 !pr-12" />
              <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary" >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-text-muted text-xs mt-1">Use 12–72 characters with at least one uppercase letter (A–Z), lowercase letter (a–z), number (0–9), and special symbol (e.g. @ or !). Avoid common passwords.</p>
            {errors.password && <p role="alert" className="text-danger text-xs mt-1">{errors.password.message}</p>}
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
