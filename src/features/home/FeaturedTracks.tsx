import {Link} from 'react-router-dom';
import {MediaImage} from '../../components/MediaImage';
import {PlayIcon} from '../player/Icons';
import type {Track} from '../player/types';

type FeaturedTracksProps = {
  sections: ReadonlyArray<{id: string; eyebrow: string; title: string; tracks: readonly Track[]}>;
  onPlayTrack: (trackId: string) => void;
};
export function FeaturedTracks({sections, onPlayTrack}: FeaturedTracksProps) {
  return <div className="home-music-sections" id="home-music">
    {sections.map((section) => <section aria-labelledby={`home-music-section-${section.id}`} className="featured-tracks" key={section.id}>
      <header><h2 id={`home-music-section-${section.id}`}>{section.title}</h2>
        <Link className="featured-tracks__library-link" to="/music">进入音乐馆</Link>
      </header>
      {section.tracks.length ? <div className="featured-tracks__list">
        {section.tracks.map((track) => <article key={track.id}>
          <MediaImage alt={`${track.title} 封面`} className="featured-track__cover" fallbackLabel={track.title} src={track.coverUrl} />
          <div><h3>{track.title}</h3><p>{track.artist}</p></div>
          <button aria-label={`播放 ${track.title}`} onClick={() => onPlayTrack(track.id)} type="button"><PlayIcon /></button>
        </article>)}
      </div> : <p role="status">这个分区暂时还没有歌曲</p>}
    </section>)}
  </div>;
}
