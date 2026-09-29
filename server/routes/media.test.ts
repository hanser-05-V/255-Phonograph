import {randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';

import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {
  createTestContext,
  linkPublishedMedia,
  seedPublishedAudio,
  type TestContext,
} from '../test/test-context.js';
import type {MediaStore, StoredMedia} from '../storage/media-store.js';

class ObservingMediaStore implements MediaStore {
  readonly #temporary = new Map<string, Buffer>();
  readonly #objects = new Map<string, Buffer>();
  readChunks = 0;

  async createTemporary(): Promise<{temporaryKey: string}> {
    const temporaryKey = randomUUID();
    this.#temporary.set(temporaryKey, Buffer.alloc(0));
    return {temporaryKey};
  }

  async writeTemporary(
    temporaryKey: string,
    source: AsyncIterable<Uint8Array>,
    options: {onProgress?: (writtenBytes: number) => void},
  ): Promise<number> {
    const chunks: Buffer[] = [];
    let writtenBytes = 0;
    for await (const chunk of source) {
      const bytes = Buffer.from(chunk);
      chunks.push(bytes);
      writtenBytes += bytes.byteLength;
      options.onProgress?.(writtenBytes);
    }
    this.#temporary.set(temporaryKey, Buffer.concat(chunks));
    return writtenBytes;
  }

  async promote(temporaryKey: string): Promise<StoredMedia> {
    const bytes = this.#temporary.get(temporaryKey);
    if (!bytes) {
      throw new Error('Missing temporary media');
    }
    const storageKey = randomUUID();
    this.#temporary.delete(temporaryKey);
    this.#objects.set(storageKey, bytes);
    return {storageKey, byteSize: bytes.byteLength};
  }

  async open(
    storageKey: string,
    range?: {start: number; end: number},
  ): Promise<{
    stream: NodeJS.ReadableStream;
    byteSize: number;
    contentLength: number;
  }> {
    const bytes = this.#objects.get(storageKey);
    if (!bytes) {
      throw Object.assign(new Error('Missing media'), {code: 'ENOENT'});
    }
    const body = range ? bytes.subarray(range.start, range.end + 1) : bytes;
    const store = this;
    const stream = Readable.from((async function* () {
      store.readChunks += 1;
      yield body;
    })());
    return {
      stream,
      byteSize: bytes.byteLength,
      contentLength: body.byteLength,
    };
  }

  async delete(storageKey: string): Promise<void> {
    this.#objects.delete(storageKey);
  }

  async cleanupTemporary(temporaryKey: string): Promise<void> {
    this.#temporary.delete(temporaryKey);
  }

  async cleanupStaleTemporary(): Promise<number> {
    const count = this.#temporary.size;
    this.#temporary.clear();
    return count;
  }
}

describe('public media route', () => {
  let context: TestContext;
  let mediaStore: ObservingMediaStore;

  beforeEach(async () => {
    mediaStore = new ObservingMediaStore();
    context = await createTestContext({mediaStore});
  });

  afterEach(async () => {
    await context.dispose();
  });

  it('serves a complete audio response and matching HEAD headers', async () => {
    const media = await seedPublishedAudio(context, Buffer.from('0123456789'));
    linkPublishedMedia(context, media, 'audio');

    const complete = await context.app.inject({
      method: 'GET',
      url: `/api/media/${media.id}`,
    });
    mediaStore.readChunks = 0;
    const head = await context.app.inject({
      method: 'HEAD',
      url: `/api/media/${media.id}`,
    });

    expect(complete.statusCode).toBe(200);
    expect(complete.headers['content-type']).toBe('audio/mpeg');
    expect(complete.headers['content-length']).toBe('10');
    expect(complete.headers['accept-ranges']).toBe('bytes');
    expect(complete.body).toBe('0123456789');
    expect(head.statusCode).toBe(200);
    expect(head.headers['content-type']).toBe(complete.headers['content-type']);
    expect(head.headers['content-length']).toBe(complete.headers['content-length']);
    expect(head.headers['accept-ranges']).toBe('bytes');
    expect(head.body).toBe('');
    expect(mediaStore.readChunks).toBe(0);
  });

  it('serves a published M4A stored with the detected audio/x-m4a MIME', async () => {
    const media = await seedPublishedAudio(context, Buffer.from('m4a-data'), 'audio/x-m4a');
    linkPublishedMedia(context, media, 'audio');
    context.db.prepare(`
      UPDATE media_objects SET original_name = 'song.m4a' WHERE id = ?
    `).run(media.id);

    const response = await context.app.inject({
      method: 'GET',
      url: `/api/media/${media.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('audio/x-m4a');
    expect(response.body).toBe('m4a-data');
  });

  it('serves audio ranges and rejects invalid or missing media', async () => {
    const media = await seedPublishedAudio(context, Buffer.from('0123456789'));
    linkPublishedMedia(context, media, 'audio');
    const partial = await context.app.inject({
      method: 'GET',
      url: `/api/media/${media.id}`,
      headers: {range: 'bytes=2-5'},
    });

    expect(partial.statusCode).toBe(206);
    expect(partial.headers['content-range']).toBe('bytes 2-5/10');
    expect(partial.headers['content-length']).toBe('4');
    expect(partial.headers['accept-ranges']).toBe('bytes');
    expect(partial.body).toBe('2345');

    const invalid = await context.app.inject({
      method: 'GET',
      url: `/api/media/${media.id}`,
      headers: {range: 'bytes=20-30'},
    });
    expect(invalid.statusCode).toBe(416);
    expect(invalid.headers['content-range']).toBe('bytes */10');

    for (const mediaId of [randomUUID(), '..%2Fsecret', 'not-a-media-id']) {
      const missing = await context.app.inject({
        method: 'GET',
        url: `/api/media/${mediaId}`,
      });
      expect(missing.statusCode).toBe(404);
    }
  });

  it('ignores Range for covers and stops serving deleted media records', async () => {
    const media = await seedPublishedAudio(
      context,
      Buffer.from('cover-data'),
      'image/png',
    );
    context.db.prepare(`
      UPDATE media_objects
      SET kind = 'cover', original_name = 'cover.png'
      WHERE id = ?
    `).run(media.id);
    linkPublishedMedia(context, media, 'cover');

    const response = await context.app.inject({
      method: 'GET',
      url: `/api/media/${media.id}`,
      headers: {range: 'bytes=2-5'},
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-range']).toBeUndefined();
    expect(response.headers['accept-ranges']).toBeUndefined();
    expect(response.headers['content-length']).toBe('10');
    expect(response.body).toBe('cover-data');

    context.db.prepare('DELETE FROM media_objects WHERE id = ?').run(media.id);
    const deleted = await context.app.inject({
      method: 'GET',
      url: `/api/media/${media.id}`,
    });
    expect(deleted.statusCode).toBe(404);
  });

  it('does not serve media with a non-whitelisted MIME type', async () => {
    const media = await seedPublishedAudio(
      context,
      Buffer.from('<script>bad</script>'),
      'text/html',
    );
    linkPublishedMedia(context, media, 'audio');

    const response = await context.app.inject({
      method: 'GET',
      url: `/api/media/${media.id}`,
    });

    expect(response.statusCode).toBe(404);
  });

  it('serves the fixed transition-media identifier format', async () => {
    const media = await seedPublishedAudio(context, Buffer.from('transition'));
    context.db.prepare(`
      UPDATE media_objects SET id = 'media-first' WHERE id = ?
    `).run(media.id);
    linkPublishedMedia(context, {...media, id: 'media-first'}, 'audio');

    const response = await context.app.inject({
      method: 'GET',
      url: '/api/media/media-first',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('transition');
  });

  it.each(['orphan', 'draft', 'unlisted', 'trashed', 'missing-date'])('does not open %s media even with an administrator session', async (state) => {
    const media = await seedPublishedAudio(context, Buffer.from('0123456789'));
    if (state !== 'orphan') {
      const id = linkPublishedMedia(context, media, 'audio');
      if (state === 'missing-date') context.db.prepare('UPDATE songs SET published_at = NULL WHERE id = ?').run(id);
      else context.db.prepare('UPDATE songs SET status = ? WHERE id = ?').run(state, id);
    }
    const session = await context.app.adminAuthService.setup('owner-password');
    for (const method of ['GET', 'HEAD'] as const) {
      const response = await context.app.inject({method, url: `/api/media/${media.id}`,
        headers: {range: 'bytes=2-5', cookie: `${context.config.sessionCookieName}=${session.token}`}});
      expect(response.statusCode).toBe(404);
      expect(response.headers['cache-control']).toBe('private, no-store');
    }
    expect(mediaStore.readChunks).toBe(0);
  });

  it('checks all current references after unlisting and replacement', async () => {
    const media = await seedPublishedAudio(context, Buffer.from('0123456789'));
    const first = linkPublishedMedia(context, media, 'audio');
    const second = linkPublishedMedia(context, media, 'audio');
    context.db.prepare("UPDATE songs SET status = 'unlisted' WHERE id = ?").run(first);
    expect((await context.app.inject({url: `/api/media/${media.id}`})).statusCode).toBe(200);
    context.db.prepare('UPDATE songs SET audio_media_id = NULL WHERE id = ?').run(second);
    mediaStore.readChunks = 0;
    expect((await context.app.inject({url: `/api/media/${media.id}`, headers: {range: 'bytes=2-5'}})).statusCode).toBe(404);
    expect(mediaStore.readChunks).toBe(0);
  });

  it.each([['bytes=7-', '789', 'bytes 7-9/10'], ['bytes=-3', '789', 'bytes 7-9/10']])('serves %s and matching HEAD without reading body', async (range, body, contentRange) => {
    const media = await seedPublishedAudio(context, Buffer.from('0123456789'));
    linkPublishedMedia(context, media, 'audio');
    const response = await context.app.inject({url: `/api/media/${media.id}`, headers: {range}});
    expect(response.statusCode).toBe(206); expect(response.body).toBe(body);
    expect(response.headers['content-range']).toBe(contentRange);
    expect(response.headers['cache-control']).toBe('private, no-store');
    mediaStore.readChunks = 0;
    const head = await context.app.inject({method: 'HEAD', url: `/api/media/${media.id}`, headers: {range}});
    expect(head.statusCode).toBe(206); expect(head.body).toBe('');
    expect(head.headers['content-length']).toBe('3'); expect(mediaStore.readChunks).toBe(0);
  });
});
