import {HomePage} from './features/home/HomePage';
import {MiniPlayer} from './features/player/MiniPlayer';
import {demoTracks} from './features/player/demo-tracks';
import {FullPlayer} from './features/player/FullPlayer';
import {PlayerProvider} from './features/player/PlayerProvider';
import {usePlayer} from './features/player/usePlayer';
import './styles/global.css';

function PlayerSurface() {
  const {isExpanded} = usePlayer();

  return (
    <>
      <HomePage />
      {isExpanded ? <FullPlayer /> : null}
      <MiniPlayer />
    </>
  );
}

export function App() {
  return (
    <PlayerProvider tracks={demoTracks}>
      <PlayerSurface />
    </PlayerProvider>
  );
}
