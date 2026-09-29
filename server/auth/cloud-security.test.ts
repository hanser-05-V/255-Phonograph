import {expect, it} from 'vitest';
import {createAuthAttemptLimiter} from './cloud-security.js';

it('limits one source across authentication routes and recovers after the window', () => {
  let now = 0; const limiter = createAuthAttemptLimiter(() => now);
  for (let i = 0; i < 5; i++) expect(limiter.take('192.0.2.1').allowed).toBe(true);
  expect(limiter.take('192.0.2.1')).toEqual({allowed: false, retryAfterSeconds: 60});
  now = 59_001; expect(limiter.take('192.0.2.1').retryAfterSeconds).toBe(1);
  now = 60_000; expect(limiter.take('192.0.2.1').allowed).toBe(true);
});
it('bounds aggregate attempts even with changing sources', () => {
  let now = 0; const limiter = createAuthAttemptLimiter(() => now);
  for (let i = 0; i < 20; i++) expect(limiter.take(`source-${i}`).allowed).toBe(true);
  for (let i = 20; i < 2048; i++) expect(limiter.take(`source-${i}`).allowed).toBe(false);
  now = 60_000; expect(limiter.take('new-source').allowed).toBe(true);
});
