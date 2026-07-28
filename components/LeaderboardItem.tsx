import React from 'react';
import { View, Text, Image } from 'react-native';
import { LeaderboardEntry } from '../data/mockData';
import { GlassContainer } from './GlassContainer';

export interface LeaderboardItemProps {
  readonly item: LeaderboardEntry;
}

export const LeaderboardItem: React.FC<LeaderboardItemProps> = ({ item }) => {
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return { bg: 'bg-[#FFD600]', text: 'text-[#131318]', label: '🥇 1st' };
      case 2:
        return { bg: 'bg-[#00eefc]', text: 'text-[#131318]', label: '🥈 2nd' };
      case 3:
        return { bg: 'bg-[#e7006e]', text: 'text-white', label: '🥉 3rd' };
      default:
        return { bg: 'bg-surface-high', text: 'text-gray-300', label: `#${rank}` };
    }
  };

  const badge = getRankBadge(item.userRank);

  return (
    <GlassContainer
      glowBorder={item.isCurrentUser ? 'purple' : 'none'}
      className={`mb-2.5 p-3 flex-row items-center justify-between ${
        item.isCurrentUser ? 'bg-[#bd00ff]/10 border-[#bd00ff]' : 'border-white/10'
      }`}
    >
      <View className="flex-row items-center flex-1 mr-2">
        {/* Rank badge */}
        <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${badge.bg}`}>
          <Text className={`font-mono font-black text-xs ${badge.text}`}>{badge.label}</Text>
        </View>

        {/* User avatar */}
        <Image source={{ uri: item.avatarUrl }} className="w-10 h-10 rounded-full mr-3 border border-white/20" />

        {/* User details */}
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="text-white font-bold text-sm mr-1.5" numberOfLines={1}>
              {item.userName}
            </Text>
            {item.isCurrentUser && (
              <View className="bg-[#bd00ff] px-1.5 py-0.5 rounded text-[9px]">
                <Text className="text-white font-bold text-[9px]">YOU</Text>
              </View>
            )}
          </View>
          <Text className="text-gray-400 text-xs" numberOfLines={1}>
            {item.songTitle} • <Text className="text-gray-500">{item.date}</Text>
          </Text>
        </View>
      </View>

      {/* Score */}
      <View className="items-end">
        <Text className="text-[#00eefc] font-mono font-black text-lg">{item.score}%</Text>
        <Text className="text-gray-500 text-[10px] uppercase font-mono">SCORE</Text>
      </View>
    </GlassContainer>
  );
};

export default LeaderboardItem;
