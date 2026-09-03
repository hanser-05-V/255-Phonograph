import {DatabaseSync} from 'node:sqlite';

export function openDatabase(databasePath: string): DatabaseSync {
  const db = new DatabaseSync(databasePath);

  db.exec('PRAGMA foreign_keys = ON');
  if (databasePath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL');
  }

  return db;
}

export function withTransaction<T>(
  db: DatabaseSync,
  work: () => T,
): T {
  db.exec('BEGIN IMMEDIATE');

  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Preserve the error raised by the transactional work.
    }
    throw error;
  }
}
