export interface KaraokeSong {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly coverUrl: string;
  readonly duration: string;
  readonly playsCount: string;
}

export interface LyricLine {
  readonly timestamp: number;
  readonly text: string;
  readonly pitchNote?: string;
  readonly isDuet?: boolean;
}

export interface ScoreBreakdown {
  readonly totalScore: number;
  readonly grade: 'SS' | 'S' | 'A' | 'B' | 'C';
  readonly pitchAccuracy: number; // percentage
  readonly rhythmPrecision: number; // percentage
  readonly toneQuality: number; // percentage
  readonly vibratoBonus: number; // pts
  readonly maxCombo: number;
  readonly rankTitle: string;
}

export interface LeaderboardEntry {
  readonly id: string;
  readonly userRank: number;
  readonly userName: string;
  readonly avatarUrl: string;
  readonly songTitle: string;
  readonly artist: string;
  readonly score: number;
  readonly isCurrentUser?: boolean;
  readonly date: string;
}

export const FEATURED_SONG: KaraokeSong = {
  id: 'dQw4w9WgXcQ',
  title: 'Cybernetic Love Signal',
  artist: 'Neon Synthetics ft. Astra',
  coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
  duration: '3:45',
  playsCount: '142.8K',
};

export const KARAOKE_SONGS: readonly KaraokeSong[] = [
  FEATURED_SONG,
  {
    id: 'L_jWHffIx5E',
    title: 'Midnight Resonance',
    artist: 'Luna Pulse',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80',
    duration: '3:12',
    playsCount: '98.4K',
  },
  {
    id: 'fJ9rUzIMcZQ',
    title: 'Electric Horizon',
    artist: 'Vapor Wave Project',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80',
    duration: '4:05',
    playsCount: '76.2K',
  },
  {
    id: 'kJQP7kiw5Fk',
    title: 'Starfall Reverie',
    artist: 'Astraea',
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&q=80',
    duration: '3:30',
    playsCount: '112.5K',
  },
  {
    id: 'OPf0YbXqDm0',
    title: 'Velvet Neon Echoes',
    artist: 'The Midnight Saints',
    coverUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&q=80',
    duration: '3:50',
    playsCount: '54.1K',
  },
  {
    id: 'song-5',
    title: 'Prism Duet',
    artist: 'Kaito & Rin',
    coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&q=80',
    duration: '4:15',
    playsCount: '89.3K',
  },
];

export const DEMO_LYRICS: readonly LyricLine[] = [
  { timestamp: 0, text: '♪ Instrumental Intro ♪', pitchNote: 'C4' },
  { timestamp: 4, text: 'Walking down the neon boulevard tonight', pitchNote: 'E4' },
  { timestamp: 8, text: 'Signals flashing purple through the velvet light', pitchNote: 'G4' },
  { timestamp: 12, text: 'Can you hear the resonance inside my soul?', pitchNote: 'A4', isDuet: true },
  { timestamp: 16, text: 'Electric frequency taking full control!', pitchNote: 'C5' },
  { timestamp: 20, text: 'Oh, we shine brighter than the starlight beam!', pitchNote: 'D5' },
  { timestamp: 24, text: 'Living in a futuristic crystal dream!', pitchNote: 'E5' },
  { timestamp: 28, text: '♪ Guitar Solo Bridge ♪', pitchNote: 'G4' },
];

export const SAMPLE_SCORE_BREAKDOWN: ScoreBreakdown = {
  totalScore: 98.4,
  grade: 'SS',
  pitchAccuracy: 97.5,
  rhythmPrecision: 99.1,
  toneQuality: 96.8,
  vibratoBonus: 450,
  maxCombo: 124,
  rankTitle: 'Grand Karaoke Master',
};

export const LEADERBOARD_ENTRIES: readonly LeaderboardEntry[] = [
  {
    id: 'lb-1',
    userRank: 1,
    userName: 'AstraVocalist',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
    songTitle: 'Cybernetic Love Signal',
    artist: 'Neon Synthetics',
    score: 99.8,
    date: 'Today, 22:15',
  },
  {
    id: 'lb-2',
    userRank: 2,
    userName: 'You (Alex)',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&q=80',
    songTitle: 'Cybernetic Love Signal',
    artist: 'Neon Synthetics',
    score: 98.4,
    isCurrentUser: true,
    date: 'Just now',
  },
  {
    id: 'lb-3',
    userRank: 3,
    userName: 'SynthQueen',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80',
    songTitle: 'Midnight Resonance',
    artist: 'Luna Pulse',
    score: 97.9,
    date: 'Yesterday',
  },
  {
    id: 'lb-4',
    userRank: 4,
    userName: 'SonicRider',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    songTitle: 'Starfall Reverie',
    artist: 'Astraea',
    score: 96.5,
    date: '2 days ago',
  },
  {
    id: 'lb-5',
    userRank: 5,
    userName: 'MelodyHunter',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
    songTitle: 'Electric Horizon',
    artist: 'Vapor Wave Project',
    score: 95.2,
    date: '3 days ago',
  },
];
