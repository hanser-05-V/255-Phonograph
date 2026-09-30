export type BackupConfig = {
  dataDir: string; workDir: string; stateDir: string; maintenanceFile: string;
  applicationUnit: 'phonograph.service'; applicationOrigin: 'http://127.0.0.1:3001';
  siteOrigin: string; releaseId: string; ageRecipientsFile: string;
  cos: {bucket: string; region: 'ap-shanghai' | 'ap-chengdu'; prefix: string};
};
export type BackupFile = {path: string; bytes: number; sha256: string};
export type BackupManifest = {
  format: 1; id: string; createdAt: string; releaseId: string; schemaVersions: number[]; files: BackupFile[];
  restoredFrom?: {backupId: string; archiveSha256: string; restoredAt: string};
};
export type BackupReceipt = {id: string; createdAt: string; objectKey: string; bytes: number; sha256: string};
export type BackupIndex = {format: 1; active: BackupReceipt[]; pendingDelete: BackupReceipt[]};
export interface BackupStore {
  readIndex(): Promise<BackupIndex>;
  writeIndex(index: BackupIndex): Promise<void>;
  upload(file: string, receipt: BackupReceipt): Promise<void>;
  head(receipt: BackupReceipt): Promise<{bytes: number}>;
  download(receipt: BackupReceipt, target: string): Promise<void>;
  delete(receipt: BackupReceipt): Promise<void>;
}
export interface ServiceControl {
  isActive(): Promise<boolean>; enterMaintenance(): Promise<void>; stop(): Promise<void>;
  start(): Promise<void>; waitHealthy(timeoutMs: number): Promise<void>; leaveMaintenance(): Promise<void>;
}
export type BackupState = {
  phase: 'idle' | 'snapshot' | 'upload' | 'failed' | 'complete';
  lastSuccessAt: string | null; lastErrorCode: string | null;
  applicationRecovered: boolean; applicationWasActive: boolean;
  latestReceipt?: BackupReceipt; pendingReceipt?: BackupReceipt;
};
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const SHA256 = /^[0-9a-f]{64}$/;
export const MAX_ARCHIVE_BYTES = 4 * 1024 ** 3;
export class OpsError extends Error {
  constructor(readonly code: string) { super(code); this.name = 'OpsError'; }
}
export function validTime(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
}
