import {PlayerControls} from './PlayerControls';
import {usePlayer} from './usePlayer';

export function MiniPlayer() {
  const {currentTrack, isExpanded, setExpanded} = usePlayer();

  return (
    <section
      aria-hidden={isExpanded}
      aria-label="迷你播放器"
      className="mini-player"
      inert={isExpanded}
      onClick={() => setExpanded(true)}
      role="region"
    >
      <div className="mini-player__track">
        {currentTrack.coverUrl ? (
          <img alt={`${currentTrack.title} 封面`} src={currentTrack.coverUrl} />
        ) : (
          <div aria-hidden="true" className="mini-player__cover-placeholder" />
        )}
        <div>
          <p>{currentTrack.title}</p>
          <p>{currentTrack.artist}</p>
        </div>
      </div>
      <PlayerControls />
    </section>
  );
}
