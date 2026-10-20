import {useMemo} from 'react';
import {Link} from 'react-router-dom';
import {HanserArtwork} from '../../components/HanserArtwork';
import {PlayIcon} from '../player/Icons';
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
    <main className="home-page page-with-mini-player" id="home">
      <HomeHeader />
      <div className="home-page__content">
        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-hero__copy"><h1 id="home-title" tabIndex={-1}>把今天，<br />听成<span>喜欢的一页。</span></h1>
            <p>这里有 hanser 的歌，<br />也有毛怪们想留住的小小日常。</p>
            <div className="home-hero__actions"><button className="public-primary" onClick={() => void player.playTrack(player.tracks[dailyTrackIndex].id)} type="button"><PlayIcon />听一首憨曲</button>
              <Link className="public-text-link" to="/music">逛逛音乐馆</Link></div>
          </div>
          <div className="home-hero__collage"><figure className="hero-photo"><HanserArtwork kind="rabbit" label="拿着胡萝卜的 hanser 插画" /><figcaption>和 hanser，一起慢慢听。</figcaption></figure>
            <HanserArtwork className="hero-portrait" kind="portrait" label="蓝白水手服的 hanser" />
            <HanserArtwork className="hero-sticker" kind="hug" />
            <p className="hero-note">这一页，留给你的好心情。</p>
          </div>
        </section>
        <ListeningSummary isPlaying={player.isPlaying} onContinue={() => void player.toggle()} stats={stats} />
        <div className="home-discovery">
          <div><div className="home-discovery__heading"><h2>今天想听什么</h2><Link to="/music">全部 {library?.songs.length ?? 0} 首</Link></div>
            <FeaturedTracks onPlayTrack={(trackId) => void player.playTrack(trackId)} sections={musicSections} />
          </div>
          <DailyFeatures dailyTrack={player.tracks[dailyTrackIndex]} onPlayDaily={() => void player.playTrack(player.tracks[dailyTrackIndex].id)} />
        </div>
        <StoryPreview />
      </div>
    </main>
  );
}
