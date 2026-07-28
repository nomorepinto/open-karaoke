import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

export interface WaveformVisualizerProps {
  readonly isPlaying: boolean;
  readonly barCount?: number;
}

const WaveformBar: React.FC<{ readonly index: number; readonly isPlaying: boolean }> = ({ index, isPlaying }) => {
  const height = useSharedValue(12);

  useEffect(() => {
    if (isPlaying) {
      const targetHeight = 15 + Math.random() * 35;
      height.value = withRepeat(
        withSequence(
          withTiming(targetHeight, { duration: 250 + (index % 5) * 60 }),
          withTiming(10 + Math.random() * 15, { duration: 250 + (index % 3) * 50 })
        ),
        -1,
        true
      );
    } else {
      height.value = withTiming(8, { duration: 300 });
    }
  }, [isPlaying, index, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  const getBarColor = (i: number) => {
    if (i % 3 === 0) return 'bg-[#00eefc]';
    if (i % 3 === 1) return 'bg-[#bd00ff]';
    return 'bg-[#e7006e]';
  };

  return (
    <Animated.View
      style={animatedStyle}
      className={`w-1.5 rounded-full mx-0.5 ${getBarColor(index)}`}
    />
  );
};

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ isPlaying, barCount = 18 }) => {
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <View className="flex-row items-center justify-center h-16 my-2 px-4 bg-surface-container/40 rounded-xl border border-white/5">
      {bars.map((barIndex) => (
        <WaveformBar key={barIndex} index={barIndex} isPlaying={isPlaying} />
      ))}
    </View>
  );
};

export default WaveformVisualizer;
