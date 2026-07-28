import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBar } from '../../components/HeaderBar';
import { ActiveLyricsCard } from '../../components/ActiveLyricsCard';
import { WaveformVisualizer } from '../../components/WaveformVisualizer';
import { GlassContainer } from '../../components/GlassContainer';
import { GlowButton } from '../../components/GlowButton';
import { useKaraokeStore } from '../../store/karaokeStore';
import { useKaraokePlayer } from '../../hooks/useKaraokePlayer';

export default function NowSingingScreen() {
  const router = useRouter();
  const activeSong = useKaraokeStore((s) => s.activeSong);
  const isMicMuted = useKaraokeStore((s) => s.isMicMuted);
  const toggleMicMute = useKaraokeStore((s) => s.toggleMicMute);
  const echoEffect = useKaraokeStore((s) => s.echoEffect);
  const toggleEchoEffect = useKaraokeStore((s) => s.toggleEchoEffect);
  const micGain = useKaraokeStore((s) => s.micGain);
  const togglePlayPause = useKaraokeStore((s) => s.togglePlayPause);

  const { isPlaying, playbackProgress, currentLyricIndex, allLyrics } = useKaraokePlayer();

  const handleFinishPerformance = () => {
    router.push('/score' as any);
  };

  return (
    <View className="flex-1 bg-surface">
      <HeaderBar title="STAGE LIVE" />

      <ScrollView className="flex-1 px-4 pt-2" showsVerticalScrollIndicator={false}>
        {/* Active Song Hero */}
        <GlassContainer glowBorder="purple" className="flex-row items-center p-3 mb-2">
          <Image source={{ uri: activeSong.coverUrl }} className="w-16 h-16 rounded-xl mr-3" />
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <View className="w-2 h-2 rounded-full bg-[#00FF66] mr-2 animate-pulse" />
              <Text className="text-[#00FF66] text-[10px] font-mono font-bold tracking-widest uppercase">
                {isPlaying ? 'LIVE SINGING' : 'READY TO SING'}
              </Text>
            </View>
            <Text className="text-white font-extrabold text-lg" numberOfLines={1}>
              {activeSong.title}
            </Text>
            <Text className="text-[#00eefc] font-medium text-xs">{activeSong.artist}</Text>
          </View>

          <TouchableOpacity
            onPress={togglePlayPause}
            className={`w-12 h-12 rounded-full items-center justify-center border shadow-lg ${
              isPlaying
                ? 'bg-[#bd00ff] border-[#bd00ff] shadow-[#bd00ff]/60'
                : 'bg-[#00eefc] border-[#00eefc] shadow-[#00eefc]/60'
            }`}
          >
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color="#ffffff" />
          </TouchableOpacity>
        </GlassContainer>

        {/* Real-time Audio Spectrum Pitch Visualizer */}
        <WaveformVisualizer isPlaying={isPlaying} barCount={22} />

        {/* Synchronized Lyric Teleprompter Card */}
        <ActiveLyricsCard lyrics={allLyrics} currentIndex={currentLyricIndex} />

        {/* Progress Bar */}
        <View className="my-2">
          <View className="flex-row justify-between mb-1">
            <Text className="text-gray-400 text-xs font-mono">0:45</Text>
            <Text className="text-[#00eefc] text-xs font-mono font-bold">{Math.round(playbackProgress)}%</Text>
            <Text className="text-gray-400 text-xs font-mono">{activeSong.duration}</Text>
          </View>
          <View className="h-2 bg-surface-container rounded-full overflow-hidden border border-white/10">
            <View
              className="h-full bg-gradient-to-r from-[#bd00ff] to-[#00eefc] rounded-full"
              style={{ width: `${playbackProgress}%` }}
            />
          </View>
        </View>

        {/* Vocal FX HUD */}
        <GlassContainer className="my-3 p-4">
          <Text className="text-gray-400 text-xs font-mono font-bold uppercase tracking-wider mb-3">
            🎛️ VOCAL CONTROLS & FX
          </Text>

          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={toggleMicMute}
              className={`flex-row items-center px-4 py-2.5 rounded-full border ${
                isMicMuted ? 'bg-tertiary/20 border-tertiary' : 'bg-[#00FF66]/20 border-[#00FF66]'
              }`}
            >
              <Ionicons name={isMicMuted ? 'mic-off' : 'mic'} size={18} color={isMicMuted ? '#e7006e' : '#00FF66'} />
              <Text className={`text-xs font-bold ml-2 ${isMicMuted ? 'text-[#e7006e]' : 'text-[#00FF66]'}`}>
                {isMicMuted ? 'MIC MUTED' : 'MIC ACTIVE'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleEchoEffect}
              className={`flex-row items-center px-4 py-2.5 rounded-full border ${
                echoEffect ? 'bg-[#00eefc]/20 border-[#00eefc]' : 'bg-surface-high border-white/10'
              }`}
            >
              <Ionicons name="radio" size={18} color={echoEffect ? '#00eefc' : '#888'} />
              <Text className={`text-xs font-bold ml-2 ${echoEffect ? 'text-[#00eefc]' : 'text-gray-400'}`}>
                {echoEffect ? 'ECHO FX ON' : 'ECHO OFF'}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-gray-400 text-xs font-mono">GAIN LEVEL</Text>
            <Text className="text-[#bd00ff] text-xs font-mono font-bold">{micGain} dB</Text>
          </View>
        </GlassContainer>

        {/* Finish Performance Button */}
        <View className="my-4 mb-8">
          <GlowButton
            title="FINISH & VIEW SCORE"
            iconName="trophy"
            variant="primary"
            onPress={handleFinishPerformance}
          />
        </View>
      </ScrollView>
    </View>
  );
}
