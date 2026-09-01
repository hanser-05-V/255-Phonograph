import {useContext} from 'react';
import {PlayerContext, type PlayerContextValue} from './PlayerProvider';

export function usePlayer(): PlayerContextValue {
  const player = useContext(PlayerContext);
  if (!player) {
    throw new Error('usePlayer must be used inside a PlayerProvider.');
  }
  return player;
}
