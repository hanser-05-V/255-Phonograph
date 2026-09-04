export type ByteRange = {start: number; end: number};

function parseSafeInteger(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new RangeError('Invalid byte range');
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new RangeError('Invalid byte range');
  }
  return parsed;
}

export function parseByteRange(
  header: string | undefined,
  size: number,
): ByteRange | null {
  if (!Number.isSafeInteger(size) || size < 0) {
    throw new RangeError('Invalid media size');
  }
  if (header === undefined) {
    return null;
  }
  if (size === 0 || header.includes(',')) {
    throw new RangeError('Range is not satisfiable');
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (match[1] === '' && match[2] === '')) {
    throw new RangeError('Invalid byte range');
  }

  if (match[1] === '') {
    const suffixLength = parseSafeInteger(match[2]);
    if (suffixLength === 0 || suffixLength > size) {
      throw new RangeError('Range is not satisfiable');
    }
    return {start: size - suffixLength, end: size - 1};
  }

  const start = parseSafeInteger(match[1]);
  const end = match[2] === '' ? size - 1 : parseSafeInteger(match[2]);
  if (start >= size || end < start || end >= size) {
    throw new RangeError('Range is not satisfiable');
  }
  return {start, end};
}
