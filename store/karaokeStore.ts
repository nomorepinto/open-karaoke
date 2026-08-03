import { create } from 'zustand';
import { KaraokeSong, FEATURED_SONG, ScoreBreakdown, SAMPLE_SCORE_BREAKDOWN } from '../data/mockData';
import { DEFAULT_MIC_MONITOR_CONFIG } from '../modules/expo-mic-monitor';

export interface KaraokeState {
  readonly activeSong: KaraokeSong;
  readonly isPlaying: boolean;
  readonly isMicMuted: boolean;
  readonly currentLyricIndex: number;
  readonly playbackProgress: number; // 0 to 100
  readonly scoreBreakdown: ScoreBreakdown;
  readonly performerName: string | null;
  readonly lastScoreRecordId: number | null;
  readonly chromecastConnected: boolean;
  readonly micGain: number; // multiplier e.g. 4.0
  readonly echoEffect: boolean;

  readonly setActiveSong: (song: KaraokeSong) => void;
  readonly togglePlayPause: () => void;
  readonly toggleMicMute: () => void;
  readonly setIsMicMuted: (isMuted: boolean) => void;
  readonly setPlaybackProgress: (progress: number) => void;
  readonly setCurrentLyricIndex: (index: number) => void;
  readonly toggleChromecast: () => void;
  readonly setMicGain: (gain: number) => void;
  readonly toggleEchoEffect: () => void;
  readonly setScoreBreakdown: (score: ScoreBreakdown) => void;
  readonly setPerformerName: (name: string | null) => void;
  readonly setLastScoreRecordId: (recordId: number | null) => void;
}

export const useKaraokeStore = create<KaraokeState>((set) => ({
  activeSong: FEATURED_SONG,
  isPlaying: false,
  isMicMuted: true,
  currentLyricIndex: 0,
  playbackProgress: 18,
  scoreBreakdown: SAMPLE_SCORE_BREAKDOWN,
  performerName: null,
  lastScoreRecordId: null,
  chromecastConnected: false,
  micGain: DEFAULT_MIC_MONITOR_CONFIG.gain,
  echoEffect: true,

  setActiveSong: (song) => set({ activeSong: song, isPlaying: true, playbackProgress: 0, currentLyricIndex: 0 }),
  togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),
  toggleMicMute: () => set((state) => ({ isMicMuted: !state.isMicMuted })),
  setIsMicMuted: (isMuted) => set({ isMicMuted: isMuted }),
  setPlaybackProgress: (progress) => set({ playbackProgress: progress }),
  setCurrentLyricIndex: (index) => set({ currentLyricIndex: index }),
  toggleChromecast: () => set((state) => ({ chromecastConnected: !state.chromecastConnected })),
  setMicGain: (gain) => set({ micGain: gain }),
  toggleEchoEffect: () => set((state) => ({ echoEffect: !state.echoEffect })),
  setScoreBreakdown: (score) => set({ scoreBreakdown: score }),
  setPerformerName: (name) => set({ performerName: name }),
  setLastScoreRecordId: (recordId) => set({ lastScoreRecordId: recordId }),
}));
