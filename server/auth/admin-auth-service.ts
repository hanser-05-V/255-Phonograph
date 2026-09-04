import {createHash, randomBytes} from 'node:crypto';

import type {DatabaseSync} from 'node:sqlite';

import {withTransaction} from '../db/database.js';
import {hashPassword, verifyPassword} from './password.js';

const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1_000;

export type AdminAuthErrorCode =
  | 'ALREADY_SETUP'
  | 'INVALID_CREDENTIALS'
  | 'SETUP_REQUIRED'
  | 'UNAUTHORIZED';

export class AdminAuthError extends Error {
  constructor(
    public readonly code: AdminAuthErrorCode,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'AdminAuthError';
  }
}

export type AdminSession = {
  token: string;
  expiresAt: string;
};

export type AdminAuthServiceDependencies = {
  now: () => Date;
  generateSessionToken: () => string;
};

const defaultDependencies: AdminAuthServiceDependencies = {
  now: () => new Date(),
  generateSessionToken: () => randomBytes(32).toString('base64url'),
};

function sessionDigest(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}

export class AdminAuthService {
  readonly #dependencies: AdminAuthServiceDependencies;

  constructor(
    private readonly db: DatabaseSync,
    dependencies: Partial<AdminAuthServiceDependencies> = {},
  ) {
    this.#dependencies = {...defaultDependencies, ...dependencies};
  }

  needsSetup(): boolean {
    return this.#passwordHash() === undefined;
  }

  async setup(password: string): Promise<AdminSession> {
    const encoded = await hashPassword(password);

    return withTransaction(this.db, () => {
      if (!this.needsSetup()) {
        throw new AdminAuthError(
          'ALREADY_SETUP',
          'The administrator password is already configured.',
          409,
        );
      }

      const now = this.#dependencies.now();
      const timestamp = now.toISOString();
      this.db
        .prepare(`
          INSERT INTO admin_config (
            singleton, password_hash, created_at, updated_at
          ) VALUES (1, ?, ?, ?)
          ON CONFLICT(singleton) DO UPDATE SET
            password_hash = excluded.password_hash,
            updated_at = excluded.updated_at
          WHERE admin_config.password_hash IS NULL
        `)
        .run(encoded, timestamp, timestamp);

      return this.#createSession(now);
    });
  }

  async login(password: string): Promise<AdminSession> {
    const encoded = this.#passwordHash();
    if (!encoded) {
      throw new AdminAuthError(
        'SETUP_REQUIRED',
        'The administrator password has not been configured.',
        409,
      );
    }
    if (!(await verifyPassword(password, encoded))) {
      throw new AdminAuthError(
        'INVALID_CREDENTIALS',
        'The administrator password is incorrect.',
        401,
      );
    }

    return withTransaction(this.db, () =>
      this.#createSession(this.#dependencies.now()),
    );
  }

  logout(token: string | undefined): void {
    if (!token) {
      return;
    }

    this.db
      .prepare(`
        UPDATE admin_sessions
        SET revoked_at = ?
        WHERE digest = ? AND revoked_at IS NULL
      `)
      .run(this.#dependencies.now().toISOString(), sessionDigest(token));
  }

  async changePassword(
    token: string | undefined,
    currentPassword: string,
    newPassword: string,
  ): Promise<AdminSession> {
    if (!token || !this.verifySession(token)) {
      throw new AdminAuthError(
        'UNAUTHORIZED',
        'A valid administrator session is required.',
        401,
      );
    }

    const previousHash = this.#passwordHash();
    if (!previousHash || !(await verifyPassword(currentPassword, previousHash))) {
      throw new AdminAuthError(
        'INVALID_CREDENTIALS',
        'The current administrator password is incorrect.',
        401,
      );
    }
    const nextHash = await hashPassword(newPassword);

    return withTransaction(this.db, () => {
      const now = this.#dependencies.now();
      if (!this.#isActiveSession(token, now) || this.#passwordHash() !== previousHash) {
        throw new AdminAuthError(
          'UNAUTHORIZED',
          'The administrator session is no longer valid.',
          401,
        );
      }

      const timestamp = now.toISOString();
      this.db
        .prepare(`
          UPDATE admin_config
          SET password_hash = ?, updated_at = ?
          WHERE singleton = 1
        `)
        .run(nextHash, timestamp);
      this.db
        .prepare(`
          UPDATE admin_sessions
          SET revoked_at = ?
          WHERE revoked_at IS NULL
        `)
        .run(timestamp);

      return this.#createSession(now);
    });
  }

  verifySession(token: string | undefined): boolean {
    if (!token) {
      return false;
    }

    const now = this.#dependencies.now();
    const timestamp = now.toISOString();
    this.db
      .prepare('DELETE FROM admin_sessions WHERE expires_at <= ?')
      .run(timestamp);

    return this.#isActiveSession(token, now);
  }

  #passwordHash(): string | undefined {
    const row = this.db
      .prepare(`
        SELECT password_hash
        FROM admin_config
        WHERE singleton = 1
      `)
      .get() as {password_hash: string | null} | undefined;

    return row?.password_hash ?? undefined;
  }

  #createSession(now: Date): AdminSession {
    const timestamp = now.toISOString();
    this.db
      .prepare('DELETE FROM admin_sessions WHERE expires_at <= ?')
      .run(timestamp);

    const token = this.#dependencies.generateSessionToken();
    const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS).toISOString();
    this.db
      .prepare(`
        INSERT INTO admin_sessions (digest, expires_at, revoked_at, created_at)
        VALUES (?, ?, NULL, ?)
      `)
      .run(sessionDigest(token), expiresAt, timestamp);

    return {token, expiresAt};
  }

  #isActiveSession(token: string, now: Date): boolean {
    return Boolean(
      this.db
        .prepare(`
          SELECT 1
          FROM admin_sessions
          WHERE digest = ? AND revoked_at IS NULL AND expires_at > ?
        `)
        .get(sessionDigest(token), now.toISOString()),
    );
  }
}
