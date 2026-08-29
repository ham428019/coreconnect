type SensitiveUserFields = {
  passwordHash: string;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
};

export function sanitizeUser<T extends SensitiveUserFields>(
  user: T,
): Omit<T, keyof SensitiveUserFields> {
  const {
    passwordHash: _passwordHash,
    failedLoginAttempts: _failedLoginAttempts,
    lockedUntil: _lockedUntil,
    ...safe
  } = user;

  return safe;
}
