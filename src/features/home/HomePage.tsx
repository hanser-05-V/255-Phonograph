import {useMemo} from 'react';
import {useLibrary} from '../library/LibraryProvider';
import {usePlayer} from '../player/usePlayer';
import {DailyFeatures} from './DailyFeatures';
import {FeaturedTracks} from './FeaturedTracks';
import {HomeHeader} from './HomeHeader';
import {ListeningSummary} from './ListeningSummary';
import {StoryPreview} from './StoryPreview';
import {getDailyTrackIndex, resolveSectionTracks} from './home-utils';
import {useDailyListeningStats} from './useDailyListeningStats';

export function HomePage() {
  const player = usePlayer();
  const {library} = useLibrary();
  const stats = useDailyListeningStats({
    isPlaying: player.isPlaying,
    trackId: player.currentTrack.id,
  });
  const dailyTrackIndex = getDailyTrackIndex(stats.date, player.tracks.length);
  const trackById = useMemo(
    () => new Map(player.tracks.map((track) => [track.id, track])),
    [player.tracks],
  );
  const musicSections = useMemo(() => {
    if (!library) {
      return [];
    }

    return [
      {
        id: 'featured',
        eyebrow: '精选音乐',
        title: '精选歌曲',
        tracks: resolveSectionTracks(trackById, library.sections.featured),
      },
      {
        id: 'live-covers',
        eyebrow: '直播回声',
        title: '直播翻唱精选',
        tracks: resolveSectionTracks(trackById, library.sections.liveCovers),
      },
      {
        id: 'recent',
        eyebrow: '曲库动态',
        title: '最近加入',
        tracks: resolveSectionTracks(trackById, library.sections.recent),
      },
    ];
  }, [library, trackById]);

  return (
    <main className="home-page" id="home">
      <HomeHeader />
      <div className="home-page__content">
        <section aria-label="今日听歌" className="home-dashboard">
          <ListeningSummary
            isPlaying={player.isPlaying}
            onContinue={() => void player.toggle()}
            stats={stats}
          />
          <DailyFeatures
            dailyTrack={player.tracks[dailyTrackIndex]}
            onPlayDaily={() => void player.playTrack(player.tracks[dailyTrackIndex].id)}
          />
        </section>
        <FeaturedTracks
          onPlayTrack={(trackId) => void player.playTrack(trackId)}
          sections={musicSections}
        />
        <StoryPreview />
      </div>
    </main>
  );
}
