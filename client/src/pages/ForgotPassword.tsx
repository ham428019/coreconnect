import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../lib/api';
import PasswordChecklist, { isStrongPassword } from '../components/PasswordChecklist';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (step === 0) {
        await api.post('/auth/forgot-password', { email });
        toast.success('If this email is registered, a code will arrive shortly.');
        setStep(1);
      } else if (step === 1) {
        const response: any = await api.post('/auth/verify-reset-otp', { email, otp });
        setToken(response.data.resetToken);
        setStep(2);
      } else {
        if (!isStrongPassword(password)) throw new Error('Please complete the password requirements shown below.');
        await api.post('/auth/reset-password', { email, resetToken: token, password });
        toast.success('Password updated. You can sign in now.');
        setStep(3);
      }
    } catch (error: any) {
      toast.error(error.message || 'Request failed');
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="card w-full max-w-md space-y-5">
        <h1 className="font-display text-2xl font-bold">Reset your password</h1>
        {step === 3 ? (
          <div className="space-y-4"><p>Your password has been changed.</p><Link to="/login" className="btn-primary inline-flex">Back to login</Link></div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {step === 0 && <><p className="text-text-muted text-sm">Enter the email associated with your account to receive a 6-digit code.</p><input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" /></>}
            {step === 1 && <><p className="text-text-muted text-sm">Enter the 6-digit code sent to {email}. The code expires in 10 minutes.</p><input className="input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit OTP" /><button type="button" className="text-accent text-sm hover:underline" disabled={loading} onClick={async () => { setLoading(true); try { await api.post('/auth/forgot-password', { email }); toast.success('If eligible, a new code has been sent'); } catch (e: any) { toast.error(e.message); } finally { setLoading(false); } }}>Resend code</button></>}
            {step === 2 && <><p className="text-text-muted text-sm">Choose a new password (12–72 characters, with uppercase and lowercase letters, a number, and a special symbol).</p><input className="input" type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" /><PasswordChecklist password={password} /></>}
            <button className="btn-primary w-full" disabled={loading} type="submit">{loading ? 'Please wait...' : step === 0 ? 'Send OTP' : step === 1 ? 'Verify OTP' : 'Reset password'}</button>
          </form>
        )}
        <Link to="/login" className="text-accent text-sm hover:underline">Back to login</Link>
      </div>
    </main>
  );
}
