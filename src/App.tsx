import {MiniPlayer} from './features/player/MiniPlayer';
import {demoTracks} from './features/player/demo-tracks';
import {FullPlayer} from './features/player/FullPlayer';
import {PlayerProvider} from './features/player/PlayerProvider';
import {usePlayer} from './features/player/usePlayer';
import './styles/global.css';

function PlayerSurface() {
  const {isExpanded} = usePlayer();

  return (
    <main className="app-shell">
      <h1>255留音机</h1>
      {isExpanded ? <FullPlayer /> : null}
      <MiniPlayer />
    </main>
  );
}

export function App() {
  return (
    <PlayerProvider tracks={demoTracks}>
      <PlayerSurface />
    </PlayerProvider>
  );
}
