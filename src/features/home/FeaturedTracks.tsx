import {Link} from 'react-router-dom';
import type {Track} from '../player/types';

type FeaturedTracksProps = {
  sections: ReadonlyArray<{
    id: string;
    eyebrow: string;
    title: string;
    tracks: readonly Track[];
  }>;
  onPlayTrack: (trackId: string) => void;
};

export function FeaturedTracks({sections, onPlayTrack}: FeaturedTracksProps) {
  return (
    <div className="home-music-sections" id="music">
      {sections.map((section) => {
        const titleId = `home-music-section-${section.id}`;
        return (
          <section
            aria-labelledby={titleId}
            className="featured-tracks"
            key={section.id}
          >
            <header>
              <div>
                <p>{section.eyebrow}</p>
                <h2 id={titleId}>{section.title}</h2>
              </div>
              <Link className="featured-tracks__library-link" to="/music">
                进入音乐馆
              </Link>
            </header>
            {section.tracks.length > 0 ? (
              <div className="featured-tracks__list">
                {section.tracks.map((track) => (
                  <article key={track.id}>
                    <h3>{track.title}</h3>
                    <p>{track.artist}</p>
                    <button
                      aria-label={`播放 ${track.title}`}
                      onClick={() => onPlayTrack(track.id)}
                      type="button"
                    >
                      播放
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p role="status">这个分区暂时还没有歌曲</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
