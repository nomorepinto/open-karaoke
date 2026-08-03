import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBar } from '../../components/HeaderBar';
import { WaveformVisualizer } from '../../components/WaveformVisualizer';
import { GlassContainer } from '../../components/GlassContainer';
import { GlowButton } from '../../components/GlowButton';
import { RecordingPlayback } from '../../components/RecordingPlayback';
import { UserNamePromptModal } from '../../components/UserNamePromptModal';
import { ScoringOverlay } from '../../components/ScoringOverlay';
import { useKaraokeStore } from '../../store/karaokeStore';
import { useMicMonitor } from '../../hooks/useMicMonitor';
import { useVoiceRecording } from '../../hooks/useVoiceRecording';
import { YouTubePlayer } from '../../components/YouTubePlayer';
import {
  BoothPipelineStage,
  mapScoreResponseToBreakdown,
  runBoothScoringPipeline,
  ScoringApiError,
} from '../../services/scoringApi';

let RTCViewComponent: any = null;
try {
  if (Platform.OS !== 'web') {
    RTCViewComponent = require('react-native-webrtc').RTCView;
  }
} catch (e) {
  // WebRTC native component fallback
}

/** Format milliseconds to MM:SS display */
function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function NowSingingScreen() {
  const router = useRouter();
  const activeSong = useKaraokeStore((s) => s.activeSong);
  const setScoreBreakdown = useKaraokeStore((s) => s.setScoreBreakdown);
  const setPerformerName = useKaraokeStore((s) => s.setPerformerName);
  const setLastScoreRecordId = useKaraokeStore((s) => s.setLastScoreRecordId);
  const micGain = useKaraokeStore((s) => s.micGain);
  const setMicGain = useKaraokeStore((s) => s.setMicGain);
  const chromecastConnected = useKaraokeStore((s) => s.chromecastConnected);
  const toggleChromecast = useKaraokeStore((s) => s.toggleChromecast);

  const { isMuted, error: micError, startMonitoring, stopMonitoring, toggleMute } = useMicMonitor();
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);

  // ── Name Prompt Modal ────────────────────────────────────────────────
  const [showNameModal, setShowNameModal] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [scoringStage, setScoringStage] = useState<BoothPipelineStage>('registering');
  const [pendingPerformerName, setPendingPerformerName] = useState<string | null>(null);

  // ── Voice Recording ─────────────────────────────────────────────────
  const {
    recordingStatus,
    recordingUri,
    durationMillis,
    hasRecording,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    deleteRecording,
  } = useVoiceRecording({ isVideoPlaying, chromecastConnected });

  // Auto-start microphone loopback monitoring on mount, clean up on unmount
  useEffect(() => {
    startMonitoring();
    return () => {
      stopMonitoring();
    };
  }, [startMonitoring, stopMonitoring]);

  const resolveRecordingUri = async (): Promise<string | null> => {
    if (recordingUri) {
      return recordingUri;
    }
    if (recordingStatus === 'recording' || recordingStatus === 'paused') {
      return stopRecording();
    }
    return null;
  };

  const handleFinishPerformance = async () => {
    const uri = await resolveRecordingUri();
    if (!uri) {
      Alert.alert(
        'No recording found',
        'Sing along with the track first so we can score your performance.',
      );
      return;
    }
    setShowNameModal(true);
  };

  const handleNameSubmit = async (name: string) => {
    setShowNameModal(false);
    setPendingPerformerName(name);
    setScoringError(null);
    setScoringStage('registering');
    setIsScoring(true);

    try {
      const uri = await resolveRecordingUri();
      if (!uri) {
        throw new Error('No vocal recording was captured. Please sing again and retry.');
      }

      const scoreResponse = await runBoothScoringPipeline({
        performerName: name,
        songTitle: activeSong.title,
        recordingUri: uri,
        onStageChange: setScoringStage,
      });

      setPerformerName(name);
      setLastScoreRecordId(scoreResponse.record_id);
      setScoreBreakdown(mapScoreResponseToBreakdown(scoreResponse));

      await deleteRecording();
      router.push({ pathname: '/score', params: { performerName: name } } as any);
    } catch (error) {
      const message =
        error instanceof ScoringApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Something went wrong while scoring your performance.';
      setScoringStage('error');
      setScoringError(message);
      Alert.alert('Scoring failed', message);
    } finally {
      setIsScoring(false);
    }
  };

  const handleSkipName = () => {
    setShowNameModal(false);
  };

  // ── Chromecast manual recording button logic ────────────────────────
  const handleChromecastRecordingToggle = () => {
    switch (recordingStatus) {
      case 'idle':
        startRecording();
        break;
      case 'recording':
        pauseRecording();
        break;
      case 'paused':
        resumeRecording();
        break;
      default:
        break;
    }
  };

  const getChromecastRecordButtonConfig = () => {
    switch (recordingStatus) {
      case 'recording':
        return { label: 'PAUSE RECORDING', icon: 'pause' as const, color: '#e7006e', bg: 'bg-[#e7006e]/15 border-[#e7006e]' };
      case 'paused':
        return { label: 'RESUME RECORDING', icon: 'play' as const, color: '#00FF66', bg: 'bg-[#00FF66]/15 border-[#00FF66]' };
      default:
        return { label: 'START RECORDING', icon: 'radio-button-on' as const, color: '#e7006e', bg: 'bg-[#e7006e]/15 border-[#e7006e]' };
    }
  };

  const chromecastBtnConfig = getChromecastRecordButtonConfig();

  return (
    <View className="flex-1 bg-surface">
      <HeaderBar title="STAGE LIVE" />
      <ScrollView className="flex-1 px-4 pt-2" showsVerticalScrollIndicator={false}>

        {/* Full-width Chromecast Button above YouTube Video */}
        <TouchableOpacity
          onPress={toggleChromecast}
          activeOpacity={0.8}
          className={`w-full py-3 px-4 rounded-2xl flex-row items-center justify-center border mb-3 ${chromecastConnected
              ? 'bg-[#00eefc]/15 border-[#00eefc]'
              : 'bg-surface-high border-white/10'
            }`}
        >
          <Ionicons
            name={chromecastConnected ? 'tv' : 'tv-outline'}
            size={18}
            color={chromecastConnected ? '#00eefc' : '#a1a1aa'}
          />
          <Text
            className={`text-xs font-bold font-mono tracking-wide ml-2 uppercase ${chromecastConnected ? 'text-[#00eefc]' : 'text-gray-300'
              }`}
          >
            {chromecastConnected ? 'CASTING TO TV — ACTIVE' : 'CAST YOUTUBE TO TV'}
          </Text>
        </TouchableOpacity>

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

        {/* Recording Indicator (Non-Chromecast: auto-synced) */}
        {!chromecastConnected && recordingStatus === 'recording' && (
          <View className="flex-row items-center justify-center my-1.5">
            <View className="w-2.5 h-2.5 rounded-full bg-[#e7006e] mr-2" />
            <Text className="text-[#e7006e] text-[10px] font-mono font-bold tracking-widest uppercase">
              REC • {formatDuration(durationMillis)}
            </Text>
          </View>
        )}

        {!chromecastConnected && recordingStatus === 'paused' && (
          <View className="flex-row items-center justify-center my-1.5">
            <View className="w-2.5 h-2.5 rounded-full bg-gray-500 mr-2" />
            <Text className="text-gray-400 text-[10px] font-mono font-bold tracking-widest uppercase">
              REC PAUSED • {formatDuration(durationMillis)}
            </Text>
          </View>
        )}

        {/* Chromecast Mode: Manual Recording Button */}
        {chromecastConnected && (
          <TouchableOpacity
            onPress={handleChromecastRecordingToggle}
            activeOpacity={0.8}
            className={`w-full py-3 px-4 rounded-2xl flex-row items-center justify-center border my-2 ${chromecastBtnConfig.bg}`}
          >
            <Ionicons
              name={chromecastBtnConfig.icon}
              size={18}
              color={chromecastBtnConfig.color}
            />
            <Text
              className="text-xs font-bold font-mono tracking-wide ml-2 uppercase"
              style={{ color: chromecastBtnConfig.color }}
            >
              {chromecastBtnConfig.label}
            </Text>
            {(recordingStatus === 'recording' || recordingStatus === 'paused') && (
              <Text
                className="text-xs font-mono ml-3 opacity-70"
                style={{ color: chromecastBtnConfig.color }}
              >
                {formatDuration(durationMillis)}
              </Text>
            )}
          </TouchableOpacity>
        )}

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

            <View className="flex-row items-center">
              <Text className="text-xs font-bold font-mono text-gray-300 mr-2 uppercase">GAIN</Text>
              <View className="flex-row items-center rounded-full border border-white/10 bg-surface-high overflow-hidden">
                <TouchableOpacity
                  onPress={() => setMicGain(Math.max(0, Number((micGain - 0.5).toFixed(1))))}
                  activeOpacity={0.7}
                  className="px-3.5 py-2 items-center justify-center border-r border-white/10 active:bg-white/15"
                >
                  <Ionicons name="remove" size={16} color="#00eefc" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setMicGain(Math.min(16.0, Number((micGain + 0.5).toFixed(1))))}
                  activeOpacity={0.7}
                  className="px-3.5 py-2 items-center justify-center active:bg-white/15"
                >
                  <Ionicons name="add" size={16} color="#00eefc" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-gray-400 text-xs font-mono">GAIN MULTIPLIER</Text>
            <Text className="text-[#bd00ff] text-xs font-mono font-bold">{micGain.toFixed(1)}x</Text>
          </View>
        </GlassContainer>

        {/* Recording Playback — Listen Back */}
        {(recordingStatus === 'recording' || recordingStatus === 'paused') && !recordingUri && (
          <TouchableOpacity
            onPress={async () => {
              await stopRecording();
            }}
            activeOpacity={0.8}
            className="my-2 flex-row items-center justify-center bg-surface-container/80 rounded-xl border border-[#bd00ff]/30 px-4 py-3"
          >
            <Ionicons name="stop-circle" size={18} color="#bd00ff" />
            <Text className="text-xs font-bold text-[#bd00ff] ml-2 font-mono uppercase tracking-wide">
              STOP & LISTEN BACK
            </Text>
            <Text className="text-xs font-mono text-[#bd00ff]/60 ml-2">
              {formatDuration(durationMillis)}
            </Text>
          </TouchableOpacity>
        )}
        {recordingUri && (
          <RecordingPlayback recordingUri={recordingUri} />
        )}

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

      {/* ── Name Prompt Modal Component ───────────────────────────────── */}
      <UserNamePromptModal
        visible={showNameModal}
        onSubmit={handleNameSubmit}
        onSkip={handleSkipName}
        onClose={() => setShowNameModal(false)}
      />

      <ScoringOverlay
        visible={isScoring}
        stage={scoringStage}
        performerName={pendingPerformerName ?? undefined}
        errorMessage={scoringError}
      />
    </View>
  );
}
