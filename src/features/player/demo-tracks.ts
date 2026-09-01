import type {Track} from './types';
import {createDemoAudioUrl} from './demo-audio';

const demoAudioUrl = createDemoAudioUrl();

const toLrcUrl = (lyrics: string) =>
  `data:text/plain;charset=utf-8,${encodeURIComponent(lyrics)}`;

export const demoTracks: Track[] = [
  {
    id: 'demo-first-light',
    title: '初光',
    artist: '255留音机',
    audioUrl: demoAudioUrl,
    lyricsUrl: toLrcUrl('[00:00.00]初光\n[00:01.20]让今天慢慢开始\n[00:02.40]留住一点安静'),
  },
  {
    id: 'demo-window-rain',
    title: '窗边雨',
    artist: '255留音机',
    audioUrl: demoAudioUrl,
    lyricsUrl: toLrcUrl('[00:00.00]窗边雨\n[00:01.20]雨声落在玻璃上\n[00:02.40]想念停在这一刻'),
  },
  {
    id: 'demo-night-walk',
    title: '夜行',
    artist: '255留音机',
    audioUrl: demoAudioUrl,
    lyricsUrl: toLrcUrl('[00:00.00]夜行\n[00:01.20]路灯照亮回家的路\n[00:02.40]晚风轻轻地唱'),
  },
];
