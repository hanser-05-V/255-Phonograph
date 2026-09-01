import {MiniPlayer} from './features/player/MiniPlayer';
import {demoTracks} from './features/player/demo-tracks';
import {PlayerProvider} from './features/player/PlayerProvider';

export function App() {
  return (
    <PlayerProvider tracks={demoTracks}>
      <main>
        <h1>255留音机</h1>
        <MiniPlayer />
      </main>
    </PlayerProvider>
  );
}
