import {DiscArtwork} from './DiscArtwork';
import {LyricsPanel} from './LyricsPanel';
import {PlayerControls} from './PlayerControls';
import {Spectrum} from './Spectrum';
import {usePlayer} from './usePlayer';
import {useTrackLyrics} from './useTrackLyrics';

export function FullPlayer() {
  const {audio, currentTime, currentTrack, error, isPlaying, setExpanded} = usePlayer();
  const lyrics = useTrackLyrics(currentTrack.lyricsUrl);
  const backdropUrl = currentTrack.backgroundUrl ?? currentTrack.coverUrl;

  return (
    <section aria-label="沉浸式播放器" className="full-player" role="region">
      {backdropUrl ? (
        <img alt="" aria-hidden="true" className="full-player__backdrop" src={backdropUrl} />
      ) : (
        <div aria-hidden="true" className="full-player__backdrop full-player__backdrop--fallback" />
      )}
      <div aria-hidden="true" className="full-player__shade" />

      <div className="full-player__shell">
        <header className="full-player__header">
          <p className="full-player__brand">255留音机</p>
          <button
            aria-label="收起播放器"
            className="full-player__close"
            onClick={() => setExpanded(false)}
            title="收起播放器"
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="full-player__grid">
          <DiscArtwork
            coverUrl={currentTrack.coverUrl}
            isPlaying={isPlaying}
            title={currentTrack.title}
          />

          <div className="full-player__details">
            <p className="full-player__eyebrow">NOW PLAYING</p>
            <h2>{currentTrack.title}</h2>
            <p className="full-player__artist">{currentTrack.artist}</p>
            {error ? (
              <p aria-label="音频状态" className="full-player__error" role="status">
                {error}
              </p>
            ) : null}
            <div className="full-player__visuals">
              <LyricsPanel currentTime={currentTime} lines={lyrics} />
              <Spectrum audio={audio} isPlaying={isPlaying} />
            </div>
          </div>
        </div>

        <footer className="full-player__controls">
          <PlayerControls />
        </footer>
      </div>
    </section>
  );
}
