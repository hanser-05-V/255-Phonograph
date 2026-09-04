import {randomUUID} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';

import type {MediaStore} from '../storage/media-store.js';

type CleanupRow = {
  id: string;
  storage_key: string;
};

export type CleanupServiceDependencies = {
  now: () => Date;
  generateId: () => string;
};

const defaultDependencies: CleanupServiceDependencies = {
  now: () => new Date(),
  generateId: randomUUID,
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown media cleanup failure';
}

export class CleanupService {
  readonly #dependencies: CleanupServiceDependencies;

  constructor(
    private readonly db: DatabaseSync,
    private readonly mediaStore: Pick<MediaStore, 'delete'>,
    dependencies: Partial<CleanupServiceDependencies> = {},
  ) {
    this.#dependencies = {...defaultDependencies, ...dependencies};
  }

  queue(storageKey: string, reason: string): string {
    const id = this.#dependencies.generateId();
    const timestamp = this.#dependencies.now().toISOString();
    this.db.prepare(`
      INSERT INTO pending_media_cleanup (
        id, storage_key, reason, attempts, last_error, created_at, updated_at
      ) VALUES (?, ?, ?, 0, NULL, ?, ?)
    `).run(id, storageKey, reason, timestamp, timestamp);
    return id;
  }

  async drain(taskIds?: readonly string[]): Promise<{succeeded: number; failed: number}> {
    const requested = taskIds ? new Set(taskIds) : null;
    const rows = (this.db.prepare(`
      SELECT id, storage_key
      FROM pending_media_cleanup
      ORDER BY created_at, id
    `).all() as CleanupRow[]).filter((row) => requested?.has(row.id) ?? true);
    let succeeded = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        await this.mediaStore.delete(row.storage_key);
        this.db.prepare('DELETE FROM pending_media_cleanup WHERE id = ?').run(row.id);
        succeeded += 1;
      } catch (error) {
        this.db.prepare(`
          UPDATE pending_media_cleanup
          SET attempts = attempts + 1, last_error = ?, updated_at = ?
          WHERE id = ?
        `).run(
          errorMessage(error),
          this.#dependencies.now().toISOString(),
          row.id,
        );
        failed += 1;
      }
    }

    return {succeeded, failed};
  }
}
