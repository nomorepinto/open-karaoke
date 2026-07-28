import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBar } from '../../components/HeaderBar';
import { LeaderboardItem } from '../../components/LeaderboardItem';
import { GlassContainer } from '../../components/GlassContainer';
import { LEADERBOARD_ENTRIES } from '../../data/mockData';

export default function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState<'global' | 'personal'>('global');

  const filteredEntries =
    activeTab === 'personal'
      ? LEADERBOARD_ENTRIES.filter((item) => item.isCurrentUser)
      : LEADERBOARD_ENTRIES;

  return (
    <View className="flex-1 bg-surface">
      <HeaderBar title="SOLO SCORES" />

      <View className="flex-1 px-4 pt-2">
        {/* User High Score Overview */}
        <GlassContainer glowBorder="purple" className="mb-4 p-4 border-[#bd00ff]/40">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Ionicons name="trophy" size={20} color="#FFD600" style={{ marginRight: 8 }} />
              <Text className="text-white font-black text-lg">YOUR PROFILE STATS</Text>
            </View>
            <View className="bg-[#bd00ff] px-2.5 py-0.5 rounded-full">
              <Text className="text-white font-bold text-[10px] uppercase">RANK #2</Text>
            </View>
          </View>

          <View className="flex-row justify-around pt-2 border-t border-white/10">
            <View className="items-center">
              <Text className="text-[#00eefc] font-mono font-black text-xl">98.4%</Text>
              <Text className="text-gray-400 text-[10px] uppercase font-mono">HIGH SCORE</Text>
            </View>
            <View className="w-[1px] bg-white/10 h-full" />
            <View className="items-center">
              <Text className="text-[#bd00ff] font-mono font-black text-xl">42</Text>
              <Text className="text-gray-400 text-[10px] uppercase font-mono">SONGS SANG</Text>
            </View>
            <View className="w-[1px] bg-white/10 h-full" />
            <View className="items-center">
              <Text className="text-[#00FF66] font-mono font-black text-xl">18</Text>
              <Text className="text-gray-400 text-[10px] uppercase font-mono">SS GRADES</Text>
            </View>
          </View>
        </GlassContainer>

        {/* Tab Toggle Filter */}
        <View className="flex-row bg-surface-container border border-white/10 rounded-full p-1 mb-4">
          <TouchableOpacity
            onPress={() => setActiveTab('global')}
            className={`flex-1 py-2 rounded-full items-center ${
              activeTab === 'global' ? 'bg-[#bd00ff]' : 'bg-transparent'
            }`}
          >
            <Text className={`text-xs font-extrabold ${activeTab === 'global' ? 'text-white' : 'text-gray-400'}`}>
              GLOBAL LEADERBOARD
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('personal')}
            className={`flex-1 py-2 rounded-full items-center ${
              activeTab === 'personal' ? 'bg-[#bd00ff]' : 'bg-transparent'
            }`}
          >
            <Text className={`text-xs font-extrabold ${activeTab === 'personal' ? 'text-white' : 'text-gray-400'}`}>
              MY HIGH SCORES
            </Text>
          </TouchableOpacity>
        </View>

        {/* Virtualized Leaderboard List */}
        <FlatList
          data={filteredEntries}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <LeaderboardItem item={item} />}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </View>
  );
}
