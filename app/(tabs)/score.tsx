import React from 'react';
import { View, Text, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBar } from '../../components/HeaderBar';
import { ScoreHeroCard } from '../../components/ScoreHeroCard';
import { ScoreMetricCard } from '../../components/ScoreMetricCard';
import { GlassContainer } from '../../components/GlassContainer';
import { GlowButton } from '../../components/GlowButton';
import { useKaraokeStore } from '../../store/karaokeStore';

export default function PerformanceScoreScreen() {
  const router = useRouter();
  const activeSong = useKaraokeStore((s) => s.activeSong);
  const scoreBreakdown = useKaraokeStore((s) => s.scoreBreakdown);

  return (
    <View className="flex-1 bg-surface">
      <HeaderBar title="STAGE RESULTS" />

      <ScrollView className="flex-1 px-4 pt-2" showsVerticalScrollIndicator={false}>
        {/* Completed Song Banner */}
        <GlassContainer className="flex-row items-center p-3 border-white/10">
          <Image source={{ uri: activeSong.coverUrl }} className="w-14 h-14 rounded-xl mr-3" />
          <View className="flex-1">
            <Text className="text-gray-400 text-[10px] font-mono font-bold tracking-widest uppercase mb-0.5">
              PERFORMANCE COMPLETED
            </Text>
            <Text className="text-white font-extrabold text-base" numberOfLines={1}>
              {activeSong.title}
            </Text>
            <Text className="text-[#00eefc] font-medium text-xs">{activeSong.artist}</Text>
          </View>
          <View className="bg-[#bd00ff]/20 border border-[#bd00ff] px-3 py-1 rounded-full">
            <Text className="text-[#bd00ff] text-xs font-bold font-mono">NEW RECORD</Text>
          </View>
        </GlassContainer>

        {/* Hero Score Badge */}
        <ScoreHeroCard scoreBreakdown={scoreBreakdown} />

        {/* Technical Metric Breakdown Grid */}
        <Text className="text-gray-400 text-xs font-mono font-bold uppercase tracking-wider my-2">
          📊 VOCAL ANALYSIS BREAKDOWN
        </Text>

        <View className="flex-row flex-wrap -mx-1.5">
          <ScoreMetricCard
            title="Pitch Accuracy"
            value={`${scoreBreakdown.pitchAccuracy}%`}
            subtitle="Matched 124 notes"
            iconName="musical-notes"
            color="cyan"
          />
          <ScoreMetricCard
            title="Rhythm Precision"
            value={`${scoreBreakdown.rhythmPrecision}%`}
            subtitle="Perfect timing"
            iconName="time"
            color="purple"
          />
          <ScoreMetricCard
            title="Tone Quality"
            value={`${scoreBreakdown.toneQuality}%`}
            subtitle="Clear vocal resonance"
            iconName="sparkles"
            color="pink"
          />
          <ScoreMetricCard
            title="Vibrato & Combo"
            value={`+${scoreBreakdown.vibratoBonus} pts`}
            subtitle={`${scoreBreakdown.maxCombo} Note Combo`}
            iconName="flame"
            color="green"
          />
        </View>

        {/* Recording Saved Card */}
        <GlassContainer glowBorder="cyan" className="my-3 p-4 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-10 h-10 rounded-full bg-[#00eefc]/20 items-center justify-center mr-3">
              <Ionicons name="mic" size={20} color="#00eefc" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-sm">Vocal Recording Ready</Text>
              <Text className="text-gray-400 text-xs">HQ Audio saved to local vault</Text>
            </View>
          </View>
          <GlowButton title="Share" variant="secondary" iconName="share-social" onPress={() => {}} />
        </GlassContainer>

        {/* Action Buttons */}
        <View className="flex-row space-x-3 my-4 mb-8">
          <View className="flex-1">
            <GlowButton
              title="SING AGAIN"
              iconName="refresh"
              variant="ghost"
              onPress={() => router.push('/singing' as any)}
            />
          </View>
          <View className="flex-1">
            <GlowButton
              title="LEADERBOARD"
              iconName="stats-chart"
              variant="primary"
              onPress={() => router.push('/leaderboard' as any)}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
