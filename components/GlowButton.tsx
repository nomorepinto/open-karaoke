import React from 'react';
import { TouchableOpacity, Text, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface GlowButtonProps {
  readonly title: string;
  readonly onPress: () => void;
  readonly variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  readonly iconName?: keyof typeof Ionicons.glyphMap;
  readonly className?: string;
  readonly style?: StyleProp<ViewStyle>;
  readonly disabled?: boolean;
}

export const GlowButton: React.FC<GlowButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  iconName,
  className = '',
  style,
  disabled = false,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-secondary text-surface-dark border-secondary shadow-cyan-500/50';
      case 'ghost':
        return 'bg-surface-high/60 text-white border-white/20';
      case 'danger':
        return 'bg-tertiary text-white border-tertiary shadow-pink-500/50';
      case 'primary':
      default:
        return 'bg-primary text-white border-primary shadow-purple-500/50';
    }
  };

  const textColor = variant === 'secondary' ? 'text-[#131318]' : 'text-white';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={style}
      className={`flex-row items-center justify-center rounded-full px-5 py-3 border shadow-md ${getVariantStyles()} ${
        disabled ? 'opacity-50' : ''
      } ${className}`}
    >
      {iconName && (
        <Ionicons
          name={iconName}
          size={18}
          color={variant === 'secondary' ? '#131318' : '#ffffff'}
          style={{ marginRight: 6 }}
        />
      )}
      <Text className={`font-bold text-sm tracking-wide ${textColor}`}>{title}</Text>
    </TouchableOpacity>
  );
};

export default GlowButton;
