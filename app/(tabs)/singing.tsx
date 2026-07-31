import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBar } from '../../components/HeaderBar';
import { WaveformVisualizer } from '../../components/WaveformVisualizer';
import { GlassContainer } from '../../components/GlassContainer';
import { GlowButton } from '../../components/GlowButton';
import { useKaraokeStore } from '../../store/karaokeStore';
import { useMicMonitor } from '../../hooks/useMicMonitor';
import { YouTubePlayer } from '../../components/YouTubePlayer';

let RTCViewComponent: any = null;
try {
  if (Platform.OS !== 'web') {
    RTCViewComponent = require('react-native-webrtc').RTCView;
  }
} catch (e) {
  // WebRTC native component fallback
}

export default function NowSingingScreen() {
  const router = useRouter();
  const activeSong = useKaraokeStore((s) => s.activeSong);
  const echoEffect = useKaraokeStore((s) => s.echoEffect);
  const toggleEchoEffect = useKaraokeStore((s) => s.toggleEchoEffect);
  const micGain = useKaraokeStore((s) => s.micGain);

  const { stream, isMuted, error: micError, startMonitoring, stopMonitoring, toggleMute } = useMicMonitor();
  // Compute native URL from stream here; hook no longer does this to stay platform-agnostic
  const streamURL: string | null = stream?.toURL ? stream.toURL() : null;
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);

  // Auto-start microphone loopback monitoring on mount, clean up on unmount
  useEffect(() => {
    startMonitoring();
    return () => {
      stopMonitoring();
    };
  }, [startMonitoring, stopMonitoring]);

  const handleFinishPerformance = () => {
    router.push('/score' as any);
  };

  return (
    <View className="flex-1 bg-surface">
      <HeaderBar title="STAGE LIVE" />

      {/* Hidden WebRTC Audio Playback Node for Mic Loopback */}
      {/* stream && streamURL && RTCViewComponent ? <RTCViewComponent streamURL={streamURL} style={{ width: 0, height: 0 }} /> : null */}

      {stream && streamURL && RTCViewComponent ? (
        <View style={{ borderWidth: 2, borderColor: 'red', padding: 4 }}>
          <RTCViewComponent
            streamURL={streamURL}
            style={{ width: 100, height: 100, backgroundColor: '#333' }}
          />
          <Text style={{ color: 'white', fontSize: 10 }}>
            RTCView mounted{'\n'}
            streamURL: {streamURL ? 'set' : 'null'}
          </Text>
        </View>
      ) : (
        <Text style={{ color: 'red' }}>
          RTCView NOT mounted — stream: {stream ? 'yes' : 'no'}, streamURL: {streamURL ? 'yes' : 'no'}
        </Text>
      )}

      <ScrollView className="flex-1 px-4 pt-2" showsVerticalScrollIndicator={false}>

        {/* YouTube Karaoke Video Player */}
        <View className="mb-3">
          <YouTubePlayer
            videoUrl={activeSong.id || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'}
            height={210}
            play={true}
            onChangeState={(state) => setIsVideoPlaying(state === 'playing')}
          />
        </View>

        {/* Real-time Audio Spectrum Pitch Visualizer */}
        <WaveformVisualizer isPlaying={isVideoPlaying} barCount={22} />

        {/* Mic Error Banner */}
        {micError && (
          <View className="bg-tertiary/20 border border-tertiary/40 rounded-xl p-3 my-2 flex-row items-center">
            <Ionicons name="warning-outline" size={18} color="#e7006e" style={{ marginRight: 8 }} />
            <Text className="text-xs text-tertiary flex-1 font-mono">
              Mic Notice: {micError}
            </Text>
          </View>
        )}

        {/* Vocal FX HUD */}
        <GlassContainer className="my-3 p-4">
          <Text className="text-gray-400 text-xs font-mono font-bold uppercase tracking-wider mb-3">
            🎛️ VOCAL CONTROLS & FX
          </Text>

          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={toggleMute}
              className={`flex-row items-center px-4 py-2.5 rounded-full border ${isMuted ? 'bg-tertiary/20 border-tertiary' : 'bg-[#00FF66]/20 border-[#00FF66]'
                }`}
            >
              <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={18} color={isMuted ? '#e7006e' : '#00FF66'} />
              <Text className={`text-xs font-bold ml-2 ${isMuted ? 'text-[#e7006e]' : 'text-[#00FF66]'}`}>
                {isMuted ? 'MIC MUTED' : 'MIC ACTIVE'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleEchoEffect}
              className={`flex-row items-center px-4 py-2.5 rounded-full border ${echoEffect ? 'bg-[#00eefc]/20 border-[#00eefc]' : 'bg-surface-high border-white/10'
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
