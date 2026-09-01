import type {Track} from '../player/types';

type DailyFeaturesProps = {
  dailyTrack: Track;
  onPlayDaily: () => void;
};

export function DailyFeatures({dailyTrack, onPlayDaily}: DailyFeaturesProps) {
  return (
    <div className="daily-features">
      <article>
        <p>每日憨曲</p>
        <h2>{dailyTrack.title}</h2>
        <p>{dailyTrack.artist}</p>
        <button
          aria-label={`播放每日憨曲：${dailyTrack.title}`}
          onClick={onPlayDaily}
          type="button"
        >
          播放每日憨曲
        </button>
      </article>
      <article>
        <p>每日一签</p>
        <p>功能筹备中</p>
        <button disabled type="button">
          每日一签
        </button>
      </article>
    </div>
  );
}
