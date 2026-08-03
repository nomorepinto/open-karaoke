import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { GlassContainer } from './GlassContainer';

export interface RecordingPlaybackProps {
  /** URI of the recorded audio file */
  readonly recordingUri: string | null;
  /** Called when the user dismisses the playback panel */
  readonly onClose?: () => void;
}

/**
 * RecordingPlayback — Self-contained component for listening back
 * to a karaoke recording. Uses expo-audio's useAudioPlayer hook.
 */
export const RecordingPlayback: React.FC<RecordingPlaybackProps> = ({
  recordingUri,
  onClose,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Create audio player from the recording URI
  const player = useAudioPlayer(recordingUri ? { uri: recordingUri } : null);
  const playerStatus = useAudioPlayerStatus(player);

  const isPlaying = playerStatus.playing;
  const currentTime = playerStatus.currentTime ?? 0;
  const duration = playerStatus.duration ?? 0;

  const runPlayerAction = useCallback((action: () => void) => {
    if (!player) return;
    try {
      action();
    } catch {
      // Native AudioPlayer may already be released during navigation/teardown.
    }
  }, [player]);

  // Toggle play/pause
  const togglePlayback = useCallback(() => {
    runPlayerAction(() => {
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    });
  }, [player, isPlaying, runPlayerAction]);

  // Seek to position
  const seekToStart = useCallback(() => {
    runPlayerAction(() => {
      player.seekTo(0);
    });
  }, [player, runPlayerAction]);

  const pausePlayback = useCallback(() => {
    runPlayerAction(() => {
      if (playerStatus.playing) {
        player.pause();
      }
    });
  }, [player, playerStatus.playing, runPlayerAction]);

  if (!recordingUri) return null;

  // Format time helper
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!isExpanded) {
    // Collapsed mini-bar
    return (
      <TouchableOpacity
        onPress={() => setIsExpanded(true)}
        activeOpacity={0.8}
        className="my-2 flex-row items-center justify-between bg-surface-container/80 rounded-xl border border-[#00eefc]/30 px-4 py-2.5"
      >
        <View className="flex-row items-center">
          <Ionicons name="headset" size={16} color="#00eefc" />
          <Text className="text-xs font-bold text-[#00eefc] ml-2 font-mono">
            RECORDING AVAILABLE
          </Text>
        </View>
        <Ionicons name="chevron-up" size={16} color="#00eefc" />
      </TouchableOpacity>
    );
  }

  return (
    <GlassContainer glowBorder="cyan" className="my-3 p-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-[#00eefc]/20 items-center justify-center mr-2.5">
            <Ionicons name="headset" size={16} color="#00eefc" />
          </View>
          <View>
            <Text className="text-white font-bold text-sm">Listen Back</Text>
            <Text className="text-gray-400 text-[10px] font-mono uppercase tracking-wider">
              Your vocal recording
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            pausePlayback();
            setIsExpanded(false);
            onClose?.();
          }}
          className="w-7 h-7 rounded-full bg-white/10 items-center justify-center"
        >
          <Ionicons name="chevron-down" size={14} color="#a1a1aa" />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View className="mb-3">
        <View className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <View
            className="h-full rounded-full bg-[#00eefc]"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </View>
        <View className="flex-row justify-between mt-1.5">
          <Text className="text-gray-500 text-[10px] font-mono">
            {formatTime(currentTime)}
          </Text>
          <Text className="text-gray-500 text-[10px] font-mono">
            {formatTime(duration)}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View className="flex-row items-center justify-center gap-4">
        {/* Restart */}
        <TouchableOpacity
          onPress={seekToStart}
          className="w-9 h-9 rounded-full bg-white/10 items-center justify-center"
        >
          <Ionicons name="play-skip-back" size={16} color="#a1a1aa" />
        </TouchableOpacity>

        {/* Play/Pause */}
        <TouchableOpacity
          onPress={togglePlayback}
          className="w-12 h-12 rounded-full bg-[#00eefc]/20 border border-[#00eefc] items-center justify-center"
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={22}
            color="#00eefc"
            style={!isPlaying ? { marginLeft: 2 } : undefined}
          />
        </TouchableOpacity>

        {/* Collapse */}
        <TouchableOpacity
          onPress={() => {
            pausePlayback();
            setIsExpanded(false);
          }}
          className="w-9 h-9 rounded-full bg-white/10 items-center justify-center"
        >
          <Ionicons name="close" size={16} color="#a1a1aa" />
        </TouchableOpacity>
      </View>
    </GlassContainer>
  );
};

export default RecordingPlayback;
