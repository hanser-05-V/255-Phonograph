import type {Track} from './types';
import {createDemoAudioUrl} from './demo-audio';

const demoAudioUrl = createDemoAudioUrl();

const toLrcUrl = (lyrics: string) =>
  `data:text/plain;charset=utf-8,${encodeURIComponent(lyrics)}`;

export const demoTracks: Track[] = [
  {
    id: 'first-light',
    title: '初光',
    artist: 'Hanser',
    audioUrl: demoAudioUrl,
    lyricsUrl: toLrcUrl('[00:00.00]初光\n[00:01.20]让今天慢慢开始\n[00:02.40]留住一点安静'),
  },
  {
    id: 'volcano-planet',
    title: '等火山喷发的小星球',
    artist: 'Hanser',
    audioUrl: demoAudioUrl,
    lyricsUrl: toLrcUrl('[00:00.00]等火山喷发的小星球\n[00:01.20]等待星光越过山口\n[00:02.40]把愿望留给宇宙'),
  },
  {
    id: 'night-walk',
    title: '夜行',
    artist: 'Hanser',
    audioUrl: demoAudioUrl,
    lyricsUrl: toLrcUrl('[00:00.00]夜行\n[00:01.20]路灯照亮回家的路\n[00:02.40]晚风轻轻地唱'),
  },
];
