import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INVALID_CREDENTIALS_MESSAGE,
  LOGIN_LOCKOUT_MESSAGE,
  LOGIN_LOCKOUT_MS,
  evaluateLoginAttempt,
} from './login-security';

const NOW = new Date('2026-08-29T12:00:00.000Z');

test('wrong credentials remain invalid for the first four consecutive attempts', () => {
  let state = { failedLoginAttempts: 0, lockedUntil: null as Date | null };

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const decision = evaluateLoginAttempt(state, false, NOW);
    assert.equal(decision.status, 'invalid');
    assert.equal(decision.nextState.failedLoginAttempts, attempt);
    assert.equal(decision.nextState.lockedUntil, null);
    state = decision.nextState;
  }

  assert.equal(INVALID_CREDENTIALS_MESSAGE, 'Invalid email or password. Please try again.');
});

test('the fifth failed attempt starts a 15-minute lockout', () => {
  const decision = evaluateLoginAttempt(
    { failedLoginAttempts: 4, lockedUntil: null },
    false,
    NOW,
  );

  assert.equal(decision.status, 'locked');
  assert.equal(decision.nextState.failedLoginAttempts, 5);
  assert.equal(decision.nextState.lockedUntil?.getTime(), NOW.getTime() + LOGIN_LOCKOUT_MS);
  assert.equal(
    LOGIN_LOCKOUT_MESSAGE,
    'Too many failed login attempts. Please try again after 15 minutes.',
  );
});

test('a correct password cannot bypass an active lockout', () => {
  const lockedUntil = new Date(NOW.getTime() + LOGIN_LOCKOUT_MS);
  const decision = evaluateLoginAttempt(
    { failedLoginAttempts: 5, lockedUntil },
    true,
    NOW,
  );

  assert.equal(decision.status, 'locked');
  assert.equal(decision.nextState.failedLoginAttempts, 5);
  assert.equal(decision.nextState.lockedUntil, lockedUntil);
});

test('a successful login resets all failed-attempt state', () => {
  const decision = evaluateLoginAttempt(
    { failedLoginAttempts: 3, lockedUntil: null },
    true,
    NOW,
  );

  assert.equal(decision.status, 'authenticated');
  assert.deepEqual(decision.nextState, { failedLoginAttempts: 0, lockedUntil: null });
});

test('login is allowed after lockout expiry and a new failed sequence starts at one', () => {
  const expiredState = {
    failedLoginAttempts: 5,
    lockedUntil: new Date(NOW.getTime() - 1),
  };

  const successful = evaluateLoginAttempt(expiredState, true, NOW);
  assert.equal(successful.status, 'authenticated');

  const invalid = evaluateLoginAttempt(expiredState, false, NOW);
  assert.equal(invalid.status, 'invalid');
  assert.deepEqual(invalid.nextState, { failedLoginAttempts: 1, lockedUntil: null });
});
