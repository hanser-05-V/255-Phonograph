import type {Track} from '../player/types';
import {filterTracks} from './home-utils';

type FeaturedTracksProps = {
  tracks: Track[];
  query: string;
  onPlayTrack: (index: number) => void;
};

export function FeaturedTracks({tracks, query, onPlayTrack}: FeaturedTracksProps) {
  const filteredTracks = filterTracks(tracks, query);

  return (
    <section aria-labelledby="featured-tracks-title" className="featured-tracks" id="music">
      <header>
        <p>精选音乐</p>
        <h2 id="featured-tracks-title">从这里开始听</h2>
      </header>
      {filteredTracks.length > 0 ? (
        <div className="featured-tracks__list">
          {filteredTracks.map((track) => {
            const trackIndex = tracks.indexOf(track);
            return (
              <article key={track.id}>
                <h3>{track.title}</h3>
                <p>{track.artist}</p>
                <button
                  aria-label={`播放 ${track.title}`}
                  onClick={() => onPlayTrack(trackIndex)}
                  type="button"
                >
                  播放
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <p role="status">没有找到相关歌曲</p>
      )}
      <div className="featured-tracks__collections" aria-label="音乐合集">
        <article>
          <h3>直播翻唱精选</h3>
          <p>持续整理中</p>
        </article>
        <article>
          <h3>最近加入</h3>
          <p>持续整理中</p>
        </article>
      </div>
    </section>
  );
}
