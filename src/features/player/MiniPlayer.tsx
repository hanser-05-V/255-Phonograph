import {MediaImage} from '../../components/MediaImage';
import {PlayerControls} from './PlayerControls';
import {usePlayer} from './usePlayer';

export function MiniPlayer() {
  const {currentTrack, error, isExpanded, setExpanded} = usePlayer();

  return (
    <section
      aria-hidden={isExpanded}
      aria-label="迷你播放器"
      className="mini-player"
      inert={isExpanded}
      role="region"
    >
      <button
        aria-label="展开播放器"
        className="mini-player__track"
        onClick={() => setExpanded(true)}
        type="button"
      >
        <MediaImage
          alt={`${currentTrack.title} 封面`}
          fallbackLabel={currentTrack.title}
          src={currentTrack.coverUrl}
        />
        <div>
          <p>{currentTrack.title}</p>
          <p>{currentTrack.artist}</p>
        </div>
      </button>
      {error ? (
        <p aria-label="音频状态" className="mini-player__error" role="status">
          {error}
        </p>
      ) : null}
      <PlayerControls />
    </section>
  );
}
