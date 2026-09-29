import {statfs} from 'node:fs/promises';

export type DiskStats = {blocks: number; bavail: number; bsize: number};
export class InsufficientStorageError extends Error {
  readonly code = 'INSUFFICIENT_STORAGE';
  readonly statusCode = 507;
  constructor() { super('存储空间不足，暂时无法上传新文件，请先检查服务器容量'); }
}
export class UploadCapacity {
  #reserved = 0;
  constructor(private readonly dataDir: string,
    private readonly readStats: (directory: string) => Promise<DiskStats> = statfs) {}
  async acquire(maxBytes: number): Promise<() => void> {
    let stats: DiskStats;
    try { stats = await this.readStats(this.dataDir); }
    catch { throw new InsufficientStorageError(); }
    const total = stats.blocks * stats.bsize;
    const available = stats.bavail * stats.bsize;
    const reservation = maxBytes + 16 * 1024 * 1024;
    if (!Number.isSafeInteger(total) || total <= 0 || !Number.isSafeInteger(available) ||
        available < 0 || available > total || !Number.isSafeInteger(maxBytes) || maxBytes <= 0 ||
        available <= total * 0.1 || available - this.#reserved < reservation + total * 0.1) {
      throw new InsufficientStorageError();
    }
    this.#reserved += reservation;
    let released = false;
    return () => { if (!released) { released = true; this.#reserved -= reservation; } };
  }
}
