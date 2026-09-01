export const formatTime = (seconds: number) => {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
};

export const nextIndex = (current: number, length: number) =>
  length > 0 ? (current + 1) % length : 0;

export const previousIndex = (current: number, length: number) =>
  length > 0 ? (current - 1 + length) % length : 0;
