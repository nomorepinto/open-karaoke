import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';

export interface GlassContainerProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly style?: StyleProp<ViewStyle>;
  readonly glowBorder?: 'purple' | 'cyan' | 'pink' | 'none';
}

export const GlassContainer: React.FC<GlassContainerProps> = ({
  children,
  className = '',
  style,
  glowBorder = 'none',
}) => {
  const borderStyle =
    glowBorder === 'purple'
      ? 'border-[#bd00ff] shadow-lg shadow-[#bd00ff]/30'
      : glowBorder === 'cyan'
      ? 'border-[#00eefc] shadow-lg shadow-[#00eefc]/30'
      : glowBorder === 'pink'
      ? 'border-[#e7006e] shadow-lg shadow-[#e7006e]/30'
      : 'border-white/10';

  return (
    <View
      style={style}
      className={`bg-surface-container/80 backdrop-blur-md rounded-2xl border ${borderStyle} p-4 ${className}`}
    >
      {children}
    </View>
  );
};

export default GlassContainer;
