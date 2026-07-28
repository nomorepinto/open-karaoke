import { create } from 'zustand';
import { KaraokeSong, FEATURED_SONG, ScoreBreakdown, SAMPLE_SCORE_BREAKDOWN } from '../data/mockData';

export interface KaraokeState {
  readonly activeSong: KaraokeSong;
  readonly isPlaying: boolean;
  readonly isMicMuted: boolean;
  readonly currentLyricIndex: number;
  readonly playbackProgress: number; // 0 to 100
  readonly scoreBreakdown: ScoreBreakdown;
  readonly chromecastConnected: boolean;
  readonly micGain: number; // 0 to 100
  readonly echoEffect: boolean;

  readonly setActiveSong: (song: KaraokeSong) => void;
  readonly togglePlayPause: () => void;
  readonly toggleMicMute: () => void;
  readonly setPlaybackProgress: (progress: number) => void;
  readonly setCurrentLyricIndex: (index: number) => void;
  readonly toggleChromecast: () => void;
  readonly setMicGain: (gain: number) => void;
  readonly toggleEchoEffect: () => void;
  readonly setScoreBreakdown: (score: ScoreBreakdown) => void;
}

export const useKaraokeStore = create<KaraokeState>((set) => ({
  activeSong: FEATURED_SONG,
  isPlaying: false,
  isMicMuted: false,
  currentLyricIndex: 0,
  playbackProgress: 18,
  scoreBreakdown: SAMPLE_SCORE_BREAKDOWN,
  chromecastConnected: true,
  micGain: 85,
  echoEffect: true,

  setActiveSong: (song) => set({ activeSong: song, isPlaying: true, playbackProgress: 0, currentLyricIndex: 0 }),
  togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),
  toggleMicMute: () => set((state) => ({ isMicMuted: !state.isMicMuted })),
  setPlaybackProgress: (progress) => set({ playbackProgress: progress }),
  setCurrentLyricIndex: (index) => set({ currentLyricIndex: index }),
  toggleChromecast: () => set((state) => ({ chromecastConnected: !state.chromecastConnected })),
  setMicGain: (gain) => set({ micGain: gain }),
  toggleEchoEffect: () => set((state) => ({ echoEffect: !state.echoEffect })),
  setScoreBreakdown: (score) => set({ scoreBreakdown: score }),
}));
