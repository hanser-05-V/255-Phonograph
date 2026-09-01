const sampleRate = 22_050;
const durationSeconds = 4;
const sampleCount = sampleRate * durationSeconds;

/** Creates a small, replaceable local WAV source for the product demo. */
export function createDemoAudioUrl() {
  const bytesPerSample = 2;
  const dataSize = sampleCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeText = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };

  writeText(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    const sample =
      (Math.sin(2 * Math.PI * 220 * time) + Math.sin(2 * Math.PI * 277.18 * time)) *
      0.04;
    view.setInt16(44 + index * bytesPerSample, Math.round(sample * 32_767), true);
  }

  return URL.createObjectURL(new Blob([buffer], {type: 'audio/wav'}));
}
