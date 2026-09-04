import {parseFile, type IAudioMetadata} from 'music-metadata';
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
