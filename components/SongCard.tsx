import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KaraokeSong } from '../data/mockData';
import { GlassContainer } from './GlassContainer';

export interface SongCardProps {
  readonly song: KaraokeSong;
  readonly onSingNow: (song: KaraokeSong) => void;
  readonly isFeatured?: boolean;
}

export const SongCard: React.FC<SongCardProps> = ({ song, onSingNow, isFeatured = false }) => {
  if (isFeatured) {
    return (
      <GlassContainer glowBorder="cyan" className="mb-6 overflow-hidden p-0 relative">
        <Image source={{ uri: song.coverUrl }} className="w-full h-48 object-cover" />
        <View className="absolute inset-0 bg-gradient-to-t from-[#131318] via-[#131318]/60 to-transparent p-4 justify-end">
          <Text className="text-white font-extrabold text-2xl mb-1">{song.title}</Text>
          <Text className="text-[#00eefc] font-medium text-sm mb-3">{song.artist}</Text>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="play-outline" size={14} color="#aaa" />
              <Text className="text-gray-400 text-xs ml-1 font-mono">{song.playsCount} plays</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onSingNow(song)}
              className="bg-[#bd00ff] flex-row items-center px-4 py-2 rounded-full shadow-lg shadow-[#bd00ff]/50"
            >
              <Ionicons name="mic" size={16} color="#ffffff" style={{ marginRight: 4 }} />
              <Text className="text-white font-extrabold text-xs">SING NOW</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GlassContainer>
    );
  }

  return (
    <GlassContainer className="mb-3 p-3 flex-row items-center justify-between border-white/10">
      <View className="flex-row items-center flex-1 mr-3">
        <Image source={{ uri: song.coverUrl }} className="w-14 h-14 rounded-xl mr-3" />
        <View className="flex-1 justify-center">
          <Text className="text-white font-bold text-base mb-0.5" numberOfLines={1}>
            {song.title}
          </Text>
          <Text className="text-gray-400 text-xs mb-1" numberOfLines={1}>
            {song.artist}
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="play-outline" size={12} color="#aaa" />
            <Text className="text-gray-400 text-[11px] ml-1 font-mono">{song.playsCount} plays</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onSingNow(song)}
        className="w-10 h-10 rounded-full bg-[#bd00ff]/20 border border-[#bd00ff] items-center justify-center"
      >
        <Ionicons name="mic" size={18} color="#bd00ff" />
      </TouchableOpacity>
    </GlassContainer>
  );
};

export default SongCard;
