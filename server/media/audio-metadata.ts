import {parseFile} from 'music-metadata';

export async function probeAudioDuration(filePath: string): Promise<number | null> {
  try {
    const metadata = await parseFile(filePath);
    const duration = metadata.format.duration;
    return typeof duration === 'number' && Number.isFinite(duration) && duration > 0
      ? duration
      : null;
  } catch {
    return null;
  }
}
