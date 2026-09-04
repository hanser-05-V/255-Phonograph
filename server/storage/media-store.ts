export type MediaKind = 'audio' | 'cover';

export type StoredMedia = {
  storageKey: string;
  byteSize: number;
};

export interface MediaStore {
  createTemporary(kind: MediaKind): Promise<{temporaryKey: string}>;
  writeTemporary(
    temporaryKey: string,
    source: AsyncIterable<Uint8Array>,
    options: {
      signal?: AbortSignal;
      onProgress?: (writtenBytes: number) => void;
    },
  ): Promise<number>;
  promote(temporaryKey: string): Promise<StoredMedia>;
  open(
    storageKey: string,
    range?: {start: number; end: number},
  ): Promise<{
    stream: NodeJS.ReadableStream;
    byteSize: number;
    contentLength: number;
  }>;
  delete(storageKey: string): Promise<void>;
  cleanupTemporary(temporaryKey: string): Promise<void>;
  cleanupStaleTemporary(olderThan: Date): Promise<number>;
}
