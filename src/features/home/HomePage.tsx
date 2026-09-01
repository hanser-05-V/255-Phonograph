import {useState} from 'react';
import {usePlayer} from '../player/usePlayer';
import {DailyFeatures} from './DailyFeatures';
import {FeaturedTracks} from './FeaturedTracks';
import {HomeHeader} from './HomeHeader';
import {ListeningSummary} from './ListeningSummary';
import {StoryPreview} from './StoryPreview';
import {getLocalDateKey} from './daily-listening';
import {getDailyTrackIndex} from './home-utils';
import {useDailyListeningStats} from './useDailyListeningStats';

export function HomePage() {
  const player = usePlayer();
  const [query, setQuery] = useState('');
  const stats = useDailyListeningStats({
    isPlaying: player.isPlaying,
    trackId: player.currentTrack.id,
  });
  const dailyTrackIndex = getDailyTrackIndex(getLocalDateKey(), player.tracks.length);

  return (
    <div className="home-page">
      <HomeHeader onQueryChange={setQuery} query={query} />
      <div className="home-page__content">
        <section aria-label="今日听歌" className="home-dashboard">
          <ListeningSummary
            isPlaying={player.isPlaying}
            onContinue={() => void player.toggle()}
            stats={stats}
          />
          <DailyFeatures
            dailyTrack={player.tracks[dailyTrackIndex]}
            onPlayDaily={() => void player.playTrack(dailyTrackIndex)}
          />
        </section>
        <FeaturedTracks
          onPlayTrack={(index) => void player.playTrack(index)}
          query={query}
          tracks={player.tracks}
        />
        <StoryPreview />
      </div>
    </div>
  );
}
