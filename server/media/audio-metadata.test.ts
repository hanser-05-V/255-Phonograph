import {parseFile, type IAudioMetadata} from 'music-metadata';
import {mkdtemp, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {probeAudioDuration} from './audio-metadata.js';

vi.mock('music-metadata', () => ({
  parseFile: vi.fn(),
}));

const parseFileMock = vi.mocked(parseFile);

describe('probeAudioDuration', () => {
  beforeEach(() => {
    parseFileMock.mockReset();
  });

  it.each([12, 188])('reads all %i AAC frames in an extensionless temporary file', async (frameCount) => {
    const actual = await vi.importActual<typeof import('music-metadata')>('music-metadata');
    parseFileMock.mockImplementation(actual.parseFile);
    // A generated silent AAC-LC ADTS frame, stereo, 48 kHz, 1024 samples per frame.
    const frame = Buffer.from('//lMgBuf/CcKAyAEAgEAgEAgEAgEAgEAgEAgEAgEAgEAgEAgEAgEAgEAgEAgEAgEAgEAgEAgEAhlL6QAAAAAAH0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+n0+muiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiijg==', 'base64');
    const directory = await mkdtemp(path.join(tmpdir(), 'aac-duration-'));
    try {
      const file = path.join(directory, 'temporary-upload');
      await writeFile(file, Buffer.concat(Array.from({length: frameCount}, () => frame)));
      const seconds = await probeAudioDuration(file, 'audio/aac');
      expect(seconds).toBeCloseTo(frameCount * 1024 / 48000, 6);
    } finally {
      await rm(directory, {recursive: true, force: true});
    }
  });

  it('returns a finite positive duration reported by music-metadata', async () => {
    parseFileMock.mockResolvedValue({
      format: {duration: 123.45},
    } as IAudioMetadata);

    await expect(probeAudioDuration('temporary-audio')).resolves.toBe(123.45);
  });

  it.each([undefined, 0, Number.POSITIVE_INFINITY])(
    'returns null when the parsed duration is %s',
    async (duration) => {
      parseFileMock.mockResolvedValue({format: {duration}} as IAudioMetadata);

      await expect(probeAudioDuration('temporary-audio')).resolves.toBeNull();
    },
  );

  it('returns null when music-metadata cannot parse the temporary file', async () => {
    parseFileMock.mockRejectedValue(new Error('unsupported audio'));

    await expect(probeAudioDuration('temporary-audio')).resolves.toBeNull();
  });
});
