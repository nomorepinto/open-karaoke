import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassContainer } from './GlassContainer';

export interface ScoreMetricCardProps {
  readonly title: string;
  readonly value: string | number;
  readonly subtitle?: string;
  readonly iconName: keyof typeof Ionicons.glyphMap;
  readonly color?: 'cyan' | 'purple' | 'pink' | 'green';
}

export const ScoreMetricCard: React.FC<ScoreMetricCardProps> = ({
  title,
  value,
  subtitle,
  iconName,
  color = 'cyan',
}) => {
  const getColorStyles = () => {
    switch (color) {
      case 'purple':
        return { text: 'text-[#bd00ff]', border: 'border-[#bd00ff]/30', icon: '#bd00ff' };
      case 'pink':
        return { text: 'text-[#e7006e]', border: 'border-[#e7006e]/30', icon: '#e7006e' };
      case 'green':
        return { text: 'text-[#00FF66]', border: 'border-[#00FF66]/30', icon: '#00FF66' };
      case 'cyan':
      default:
        return { text: 'text-[#00eefc]', border: 'border-[#00eefc]/30', icon: '#00eefc' };
    }
  };

  const theme = getColorStyles();

  return (
    <GlassContainer className={`flex-1 min-w-[45%] m-1.5 p-3.5 border ${theme.border}`}>
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-gray-400 text-xs font-mono tracking-wider font-semibold uppercase">{title}</Text>
        <Ionicons name={iconName} size={16} color={theme.icon} />
      </View>

      <Text className={`font-mono text-2xl font-black ${theme.text} mb-0.5`}>{value}</Text>

      {subtitle && <Text className="text-gray-500 text-[10px] font-medium">{subtitle}</Text>}
    </GlassContainer>
  );
};

export default ScoreMetricCard;
