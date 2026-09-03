import type {DatabaseSync} from 'node:sqlite';

import {withTransaction} from './database.js';
import {applyInitialMigration} from './migrations/001-initial.js';

type Migration = {
  version: number;
  apply: (db: DatabaseSync) => void;
};

const migrations: readonly Migration[] = [
  {version: 1, apply: applyInitialMigration},
];

function hasMigrationTable(db: DatabaseSync): boolean {
  return Boolean(
    db
      .prepare(`
        SELECT 1
        FROM sqlite_master
        WHERE type = 'table' AND name = 'schema_migrations'
      `)
      .get(),
  );
}

function appliedVersions(db: DatabaseSync): Set<number> {
  if (!hasMigrationTable(db)) {
    return new Set();
  }

  return new Set(
    db
      .prepare('SELECT version FROM schema_migrations')
      .all()
      .map((row) => Number(row.version)),
  );
}

export function runMigrations(db: DatabaseSync): void {
  const applied = appliedVersions(db);

  for (const migration of migrations) {
    if (applied.has(migration.version)) {
      continue;
    }

    withTransaction(db, () => {
      migration.apply(db);
      db.prepare(`
        INSERT INTO schema_migrations (version, applied_at)
        VALUES (?, ?)
      `).run(migration.version, new Date().toISOString());
    });
  }
}
