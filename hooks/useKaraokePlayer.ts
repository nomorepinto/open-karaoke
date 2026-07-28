import { useEffect } from 'react';
import { useKaraokeStore } from '../store/karaokeStore';
import { DEMO_LYRICS } from '../data/mockData';

export function useKaraokePlayer() {
  const isPlaying = useKaraokeStore((s) => s.isPlaying);
  const playbackProgress = useKaraokeStore((s) => s.playbackProgress);
  const currentLyricIndex = useKaraokeStore((s) => s.currentLyricIndex);
  const setPlaybackProgress = useKaraokeStore((s) => s.setPlaybackProgress);
  const setCurrentLyricIndex = useKaraokeStore((s) => s.setCurrentLyricIndex);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setPlaybackProgress((playbackProgress + 0.5) % 100);

      // Simple lyric synchronization logic based on progress
      const nextIndex = Math.floor((playbackProgress / 100) * DEMO_LYRICS.length);
      if (nextIndex !== currentLyricIndex && nextIndex < DEMO_LYRICS.length) {
        setCurrentLyricIndex(nextIndex);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [isPlaying, playbackProgress, currentLyricIndex, setPlaybackProgress, setCurrentLyricIndex]);

  return {
    isPlaying,
    playbackProgress,
    currentLyricIndex,
    currentLyric: DEMO_LYRICS[currentLyricIndex] || DEMO_LYRICS[0],
    allLyrics: DEMO_LYRICS,
  };
}
