import {useRef, useState} from 'react';
import {HanserArtwork} from '../../components/HanserArtwork';
import {MediaImage} from '../../components/MediaImage';
import {PlayerControls} from './PlayerControls';
import {usePlayer} from './usePlayer';

export function MiniPlayer() {
  const {currentTrack, error, isExpanded, setExpanded, tracks, queueIds, playTrack} = usePlayer();
  const [queueOpen, setQueueOpen] = useState(false);
  const queueButton = useRef<HTMLButtonElement>(null);
  const queuedTracks = queueIds.flatMap((id) => {const track = tracks.find((item) => item.id === id); return track ? [track] : [];});
  return <section aria-hidden={isExpanded} aria-label="迷你播放器" className="mini-player" inert={isExpanded} role="region"
    onKeyDown={(event) => {if (event.key === 'Escape' && queueOpen) {setQueueOpen(false); queueButton.current?.focus(); event.stopPropagation();}}}>
    <HanserArtwork className="mini-player__companion" kind="cheer" />
    <button aria-label="展开播放器" className="mini-player__track" onClick={() => setExpanded(true)} type="button">
      <MediaImage alt={`${currentTrack.title} 封面`} fallbackLabel={currentTrack.title} src={currentTrack.coverUrl} />
      <div><p>{currentTrack.title}</p><p>{currentTrack.artist}</p></div>
    </button>
    {error ? <p aria-label="音频状态" className="mini-player__error" role="status">{error}</p> : null}
    <PlayerControls />
    <button aria-controls="mini-player-queue" aria-expanded={queueOpen} aria-label="播放列表" className="mini-player__queue-toggle"
      onClick={() => setQueueOpen(!queueOpen)} ref={queueButton} type="button">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16M4 12h16M4 18h12" /></svg>
    </button>
    {queueOpen ? <section aria-label="当前播放列表" className="mini-player__queue" id="mini-player-queue">
      <header><h2>当前播放列表 · {queuedTracks.length} 首</h2><button onClick={() => {setQueueOpen(false);queueButton.current?.focus();}} type="button">关闭列表</button></header>
      <ol>{queuedTracks.map((track) => <li key={track.id}><button aria-current={track.id === currentTrack.id ? 'true' : undefined}
        aria-label={`播放 ${track.title}`} onClick={() => void playTrack(track.id, queueIds)} type="button"><span>{track.title}</span><small>{track.artist}</small></button></li>)}</ol>
    </section> : null}
  </section>;
}
