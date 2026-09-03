export type DemoAudioOptions = {
  durationSeconds?: number;
  frequencyHz?: number;
  sampleRate?: number;
};

const WAV_HEADER_BYTES = 44;
const PCM_FORMAT = 1;
const MONO_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

export function createDemoAudio(
  options: DemoAudioOptions = {},
): Uint8Array {
  const durationSeconds = options.durationSeconds ?? 1;
  const frequencyHz = options.frequencyHz ?? 440;
  const sampleRate = options.sampleRate ?? 8_000;
  const sampleCount = Math.round(durationSeconds * sampleRate);
  const bytesPerSample = BITS_PER_SAMPLE / 8;
  const dataBytes = sampleCount * bytesPerSample;
  const wav = Buffer.alloc(WAV_HEADER_BYTES + dataBytes);

  wav.write('RIFF', 0, 'ascii');
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVE', 8, 'ascii');
  wav.write('fmt ', 12, 'ascii');
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(PCM_FORMAT, 20);
  wav.writeUInt16LE(MONO_CHANNELS, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * MONO_CHANNELS * bytesPerSample, 28);
  wav.writeUInt16LE(MONO_CHANNELS * bytesPerSample, 32);
  wav.writeUInt16LE(BITS_PER_SAMPLE, 34);
  wav.write('data', 36, 'ascii');
  wav.writeUInt32LE(dataBytes, 40);

  for (let sample = 0; sample < sampleCount; sample += 1) {
    const seconds = sample / sampleRate;
    const value = Math.sin(2 * Math.PI * frequencyHz * seconds);
    wav.writeInt16LE(Math.round(value * 0.12 * 32_767), WAV_HEADER_BYTES + sample * 2);
  }

  return wav;
}
