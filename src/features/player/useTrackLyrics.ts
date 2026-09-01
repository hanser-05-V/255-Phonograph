import {useEffect, useState} from 'react';
import {parseLrc} from './lrc';
import type {LyricLine} from './types';

export function useTrackLyrics(lyricsUrl?: string) {
  const [lines, setLines] = useState<LyricLine[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrent = true;
    setLines([]);

    if (!lyricsUrl) {
      return () => controller.abort();
    }

    void (async () => {
      try {
        const response = await fetch(lyricsUrl, {signal: controller.signal});
        if (!response.ok) {
          throw new Error(`Unable to load lyrics: ${response.status}`);
        }
        const content = await response.text();
        if (isCurrent) {
          setLines(parseLrc(content));
        }
      } catch {
        if (isCurrent) {
          setLines([]);
        }
      }
    })();

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [lyricsUrl]);

  return lines;
}
