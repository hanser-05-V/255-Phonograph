import {useEffect, useRef} from 'react';
import {findActiveLyricIndex} from './lrc';
import type {LyricLine} from './types';

type LyricsPanelProps = {
  lines: LyricLine[];
  currentTime: number;
};

export function LyricsPanel({currentTime, lines}: LyricsPanelProps) {
  const activeIndex = findActiveLyricIndex(lines, currentTime);
  const activeLineRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    activeLineRef.current?.scrollIntoView?.({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'center',
    });
  }, [activeIndex]);

  if (lines.length === 0) {
    return <p className="lyrics-panel__empty">暂无歌词</p>;
  }

  return (
    <div aria-label="歌词" className="lyrics-panel" role="region">
      {lines.map((line, index) => {
        const isActive = index === activeIndex;

        return (
          <p
            aria-current={isActive ? 'true' : undefined}
            className="lyrics-panel__line"
            key={`${line.time}-${index}`}
            ref={isActive ? activeLineRef : undefined}
          >
            {line.text}
          </p>
        );
      })}
    </div>
  );
}
