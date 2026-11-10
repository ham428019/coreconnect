import { CheckCircle2, Circle } from 'lucide-react';

const commonPasswords = new Set([
  'password123', 'password1234', 'password12345', '123456789012',
  'qwerty123456', 'admin12345678', 'letmein123456', 'iloveyou12345',
]);

export function passwordChecks(password: string) {
  return [
    { label: '12–72 characters', valid: password.length >= 12 && password.length <= 72 },
    { label: 'At least one uppercase letter (A–Z)', valid: /[A-Z]/.test(password) },
    { label: 'At least one lowercase letter (a–z)', valid: /[a-z]/.test(password) },
    { label: 'At least one number (0–9)', valid: /[0-9]/.test(password) },
    { label: 'At least one special symbol (e.g. @ or !)', valid: /[^A-Za-z0-9\s]/.test(password) },
    { label: 'Not a commonly used password', valid: password.length > 0 && !commonPasswords.has(password.toLowerCase()) },
  ];
}

export function isStrongPassword(password: string) {
  return passwordChecks(password).every(check => check.valid);
}

export default function PasswordChecklist({ password }: { password: string }) {
  return (
    <div className="space-y-1.5" aria-label="Password requirements">
      <p className="text-text-muted text-xs">Your password must include:</p>
      <ul className="space-y-1">
        {passwordChecks(password).map(check => (
          <li key={check.label} className={`flex items-center gap-2 text-xs ${check.valid ? 'text-green-600 dark:text-green-400' : 'text-text-muted'}`}>
            {check.valid ? <CheckCircle2 size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}
            <span>{check.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
