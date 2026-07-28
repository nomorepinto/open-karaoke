import React from 'react';
import { View, Text } from 'react-native';
import { LyricLine } from '../data/mockData';
import { GlassContainer } from './GlassContainer';

export interface ActiveLyricsCardProps {
  readonly lyrics: readonly LyricLine[];
  readonly currentIndex: number;
}

export const ActiveLyricsCard: React.FC<ActiveLyricsCardProps> = ({ lyrics, currentIndex }) => {
  const previousLine = currentIndex > 0 ? lyrics[currentIndex - 1] : null;
  const currentLine = lyrics[currentIndex] || lyrics[0];
  const nextLine = currentIndex < lyrics.length - 1 ? lyrics[currentIndex + 1] : null;

  return (
    <GlassContainer glowBorder="purple" className="my-4 p-5 items-center justify-center min-h-[180px]">
      {/* Pitch Badge */}
      {currentLine?.pitchNote && (
        <View className="self-end bg-[#00eefc]/20 border border-[#00eefc] px-2.5 py-1 rounded-md mb-2">
          <Text className="text-[#00eefc] text-[10px] font-mono font-bold tracking-widest">
            KEY: {currentLine.pitchNote}
          </Text>
        </View>
      )}

      {/* Previous line (faded) */}
      {previousLine && (
        <Text className="text-gray-500 text-sm font-medium mb-2 text-center opacity-60" numberOfLines={1}>
          {previousLine.text}
        </Text>
      )}

      {/* Active Line (Glowing Neon Pink / White) */}
      <Text
        className="text-white text-2xl font-black text-center my-3 tracking-tight shadow-lg shadow-[#e7006e]/80"
        style={{
          textShadowColor: 'rgba(231, 0, 110, 0.8)',
          textShadowRadius: 12,
        }}
      >
        {currentLine ? currentLine.text : '...'}
      </Text>

      {/* Next line (upcoming) */}
      {nextLine && (
        <Text className="text-[#00eefc]/80 text-base font-semibold mt-2 text-center" numberOfLines={1}>
          {nextLine.text}
        </Text>
      )}
    </GlassContainer>
  );
};

export default ActiveLyricsCard;
