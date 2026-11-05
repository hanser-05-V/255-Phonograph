import {parseFile} from 'music-metadata';

export async function probeAudioDuration(filePath: string, detectedMime?: string): Promise<number | null> {
  try {
    // ADTS AAC has no total-duration header; count frames instead of stopping after three.
    const metadata = await parseFile(filePath, detectedMime === 'audio/aac' ? {duration: true} : undefined);
    const duration = metadata.format.duration;
    return typeof duration === 'number' && Number.isFinite(duration) && duration > 0
      ? duration
      : null;
  } catch {
    return null;
  }
}
