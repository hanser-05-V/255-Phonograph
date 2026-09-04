export type LyricLine = {
  time: number;
  text: string;
};

export type LrcValidationResult = {
  valid: boolean;
  errors: Array<{line: number; message: string}>;
};

const METADATA_TAG = /^\[(?:ar|al|ti|by|offset|re|ve|length):.*\]$/i;
const TIME_TAG = /\[(\d{2,}):(\d{2}(?:\.\d+)?)\]/g;
const TIME_LIKE_TAG = /\[(\d+):(\d+(?:\.\d+)?)\]/g;

function leadingTimeTags(line: string): {
  end: number;
  times: number[];
} {
  const times: number[] = [];
  let end = 0;

  TIME_TAG.lastIndex = 0;
  let match = TIME_TAG.exec(line);
  while (match && match.index === end) {
    const seconds = Number(match[2]);
    if (seconds >= 60) {
      return {end: 0, times: []};
    }
    times.push(Number(match[1]) * 60 + seconds);
    end = TIME_TAG.lastIndex;
    match = TIME_TAG.exec(line);
  }

  return {end, times};
}

export function parseLrc(content: string): LyricLine[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !METADATA_TAG.test(line))
    .flatMap((line) => {
      const {end, times} = leadingTimeTags(line);
      if (times.length === 0) {
        return [];
      }
      const text = line.slice(end).trim();
      return times.map((time) => ({time, text}));
    })
    .sort((left, right) => left.time - right.time);
}

export function validateLrc(content: string): LrcValidationResult {
  const errors: LrcValidationResult['errors'] = [];

  content.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (line.length === 0 || METADATA_TAG.test(line)) {
      return;
    }

    const openingBrackets = (line.match(/\[/g) ?? []).length;
    const closingBrackets = (line.match(/\]/g) ?? []).length;
    if (openingBrackets !== closingBrackets) {
      errors.push({line: index + 1, message: '歌词时间标签括号不完整'});
      return;
    }

    TIME_LIKE_TAG.lastIndex = 0;
    for (const match of line.matchAll(TIME_LIKE_TAG)) {
      if (Number(match[2]) >= 60) {
        errors.push({
          line: index + 1,
          message: '歌词时间标签的秒数必须小于 60',
        });
        return;
      }
    }

    if (leadingTimeTags(line).times.length === 0) {
      errors.push({line: index + 1, message: '歌词行缺少有效时间标签'});
    }
  });

  return {valid: errors.length === 0, errors};
}

export function findActiveLyricIndex(
  lyrics: LyricLine[],
  currentTime: number,
): number {
  for (let index = lyrics.length - 1; index >= 0; index -= 1) {
    if (lyrics[index].time <= currentTime) {
      return index;
    }
  }
  return -1;
}
