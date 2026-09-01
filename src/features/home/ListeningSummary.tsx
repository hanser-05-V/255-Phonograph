import type {DailyListeningView} from './daily-listening';

type ListeningSummaryProps = {
  stats: DailyListeningView;
  isPlaying: boolean;
  onContinue: () => void;
};

export function ListeningSummary({stats, isPlaying, onContinue}: ListeningSummaryProps) {
  return (
    <article className="listening-summary">
      <div>
        <p>今天的憨浓度</p>
        <strong>{stats.concentration}%</strong>
      </div>
      <dl>
        <div>
          <dt>听歌分钟</dt>
          <dd>{stats.minutes}</dd>
        </div>
        <div>
          <dt>听过歌曲</dt>
          <dd>{stats.songCount}</dd>
        </div>
      </dl>
      <button onClick={onContinue} type="button">
        {isPlaying ? '暂停播放' : '继续听歌'}
      </button>
    </article>
  );
}
