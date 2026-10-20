import {HanserArtwork} from '../../components/HanserArtwork';
import {PlayIcon} from '../player/Icons';
import type {Track} from '../player/types';

type DailyFeaturesProps = {dailyTrack: Track; onPlayDaily: () => void};
export function DailyFeatures({dailyTrack, onPlayDaily}: DailyFeaturesProps) {
  return <div className="daily-features">
    <article className="daily-song"><HanserArtwork kind="heart" />
      <h2>每日憨曲</h2><h3>{dailyTrack.title}</h3><p>{dailyTrack.artist} · 让熟悉的歌声，陪你一会儿。</p>
      <button aria-label={`播放每日憨曲：${dailyTrack.title}`} onClick={onPlayDaily} type="button"><PlayIcon />现在听听</button>
    </article>
    <article className="daily-fortune"><h2>每日一签</h2><p id="fortune-note">功能筹备中</p>
      <button aria-describedby="fortune-note" disabled type="button">每日一签</button>
    </article>
  </div>;
}
