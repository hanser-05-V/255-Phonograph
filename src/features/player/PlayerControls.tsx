import {formatTime} from './player-utils';
import {MutedIcon, NextIcon, PauseIcon, PlayIcon, PreviousIcon, VolumeIcon} from './Icons';
import {usePlayer} from './usePlayer';

export function PlayerControls() {
  const {
    currentTime,
    duration,
    isMuted,
    isPlaying,
    next,
    previous,
    seek,
    setVolume,
    toggle,
    toggleMuted,
    volume,
  } = usePlayer();
  const canSeek = Number.isFinite(duration) && duration > 0;
  const safeCurrentTime = canSeek
    ? Math.min(Math.max(0, Number.isFinite(currentTime) ? currentTime : 0), duration)
    : 0;

  return (
    <div className="player-controls" onClick={(event) => event.stopPropagation()}>
      <div aria-label="播放时间" className="player-controls__timeline">
        <output>{formatTime(safeCurrentTime)}</output>
        <input
          aria-label="播放进度"
          disabled={!canSeek}
          max={canSeek ? duration : 0}
          min={0}
          onChange={(event) => seek(Number(event.target.value))}
          step={0.1}
          type="range"
          value={safeCurrentTime}
        />
        <output>{formatTime(duration)}</output>
      </div>

      <div className="player-controls__transport">
        <button aria-label="上一首" onClick={previous} title="上一首" type="button">
          <PreviousIcon />
        </button>
        <button
          aria-label={isPlaying ? '暂停' : '播放'}
          onClick={() => void toggle()}
          title={isPlaying ? '暂停' : '播放'}
          type="button"
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button aria-label="下一首" onClick={next} title="下一首" type="button">
          <NextIcon />
        </button>
      </div>

      <div className="player-controls__volume">
        <button
          aria-label={isMuted ? '取消静音' : '静音'}
          onClick={toggleMuted}
          title={isMuted ? '取消静音' : '静音'}
          type="button"
        >
          {isMuted ? <MutedIcon /> : <VolumeIcon />}
        </button>
        <input
          aria-label="音量"
          max={1}
          min={0}
          onChange={(event) => setVolume(Number(event.target.value))}
          step={0.01}
          type="range"
          value={volume}
        />
      </div>
    </div>
  );
}
