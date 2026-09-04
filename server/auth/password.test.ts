import {describe, expect, it} from 'vitest';

import {hashPassword, verifyPassword} from './password.js';

describe('password hashing', () => {
  it('stores a salted scrypt hash and never the plaintext password', async () => {
    const password = 'correct horse battery staple';

    const first = await hashPassword(password);
    const second = await hashPassword(password);

    expect(first).not.toBe(second);
    expect(first).not.toContain(password);
    expect(first).toMatch(
      /^scrypt\$16384\$8\$1\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/,
    );
    await expect(verifyPassword(password, first)).resolves.toBe(true);
    await expect(verifyPassword('wrong password', first)).resolves.toBe(false);
  });

  it.each([
    '',
    'plaintext',
    'scrypt$broken',
    'scrypt$16384$8$1$not+base64url$also+invalid',
    'scrypt$16384$8$1$c2FsdA$YWJj',
    'scrypt$32768$8$1$c2FsdA$YWJj',
  ])('returns false for a malformed encoded hash: %s', async (encoded) => {
    await expect(verifyPassword('password', encoded)).resolves.toBe(false);
  });

  it('rejects trailing fields after an otherwise valid hash', async () => {
    const encoded = await hashPassword('password');

    await expect(
      verifyPassword('password', `${encoded}$unexpected`),
    ).resolves.toBe(false);
  });
});
