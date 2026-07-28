import React from 'react';
import { View, Text } from 'react-native';
import { ScoreBreakdown } from '../data/mockData';
import { GlassContainer } from './GlassContainer';

export interface ScoreHeroCardProps {
  readonly scoreBreakdown: ScoreBreakdown;
}

export const ScoreHeroCard: React.FC<ScoreHeroCardProps> = ({ scoreBreakdown }) => {
  return (
    <GlassContainer glowBorder="purple" className="items-center justify-center p-6 my-4 border-[#bd00ff]/40">
      {/* Grade Badge */}
      <View className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#bd00ff] to-[#00eefc] items-center justify-center border-4 border-white shadow-xl shadow-[#bd00ff]/60 mb-3">
        <Text className="text-white font-black text-4xl tracking-tighter">{scoreBreakdown.grade}</Text>
      </View>

      <Text className="text-gray-400 text-xs font-mono tracking-widest uppercase mb-1">FINAL OVERALL RATING</Text>

      {/* Numerical score */}
      <Text
        className="text-[#00eefc] text-6xl font-black tracking-tight mb-2"
        style={{
          textShadowColor: 'rgba(0, 238, 252, 0.8)',
          textShadowRadius: 16,
        }}
      >
        {scoreBreakdown.totalScore}%
      </Text>

      {/* Rank Title */}
      <View className="bg-[#bd00ff]/20 border border-[#bd00ff] px-4 py-1 rounded-full">
        <Text className="text-[#ecb2ff] text-xs font-bold tracking-wider uppercase">
          🏆 {scoreBreakdown.rankTitle}
        </Text>
      </View>
    </GlassContainer>
  );
};

export default ScoreHeroCard;
