import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CategoryItem } from '../data/mockData';

export interface CategoryChipProps {
  readonly category: CategoryItem;
  readonly isSelected: boolean;
  readonly onSelect: (id: string) => void;
}

export const CategoryChip: React.FC<CategoryChipProps> = ({ category, isSelected, onSelect }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onSelect(category.id)}
      className={`flex-row items-center px-4 py-2 rounded-full mr-2.5 border ${
        isSelected
          ? 'bg-[#bd00ff] border-[#bd00ff] shadow-md shadow-[#bd00ff]/40'
          : 'bg-surface-container/90 border-white/10'
      }`}
    >
      <Ionicons
        name={category.iconName as keyof typeof Ionicons.glyphMap}
        size={14}
        color={isSelected ? '#ffffff' : '#a0a0b0'}
        style={{ marginRight: 6 }}
      />
      <Text className={`text-xs font-semibold ${isSelected ? 'text-white font-bold' : 'text-gray-300'}`}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
};

export default CategoryChip;
