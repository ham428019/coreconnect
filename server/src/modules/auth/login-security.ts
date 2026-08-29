export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
export const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password. Please try again.';
export const LOGIN_LOCKOUT_MESSAGE = 'Too many failed login attempts. Please try again after 15 minutes.';

export interface LoginSecurityState {
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

export type LoginAttemptDecision = {
  status: 'authenticated' | 'invalid' | 'locked';
  nextState: LoginSecurityState;
};

export function isLoginLocked(state: LoginSecurityState, now: Date): boolean {
  return state.lockedUntil !== null && state.lockedUntil.getTime() > now.getTime();
}

export function evaluateLoginAttempt(
  state: LoginSecurityState,
  passwordValid: boolean,
  now: Date,
): LoginAttemptDecision {
  if (isLoginLocked(state, now)) {
    return { status: 'locked', nextState: state };
  }

  // An expired lockout starts a fresh sequence of attempts.
  const previousAttempts = state.lockedUntil === null ? state.failedLoginAttempts : 0;

  if (passwordValid) {
    return {
      status: 'authenticated',
      nextState: { failedLoginAttempts: 0, lockedUntil: null },
    };
  }

  const failedLoginAttempts = previousAttempts + 1;
  if (failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    return {
      status: 'locked',
      nextState: {
        failedLoginAttempts: MAX_FAILED_LOGIN_ATTEMPTS,
        lockedUntil: new Date(now.getTime() + LOGIN_LOCKOUT_MS),
      },
    };
  }

  return {
    status: 'invalid',
    nextState: { failedLoginAttempts, lockedUntil: null },
  };
}
