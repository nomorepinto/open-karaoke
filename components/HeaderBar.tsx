import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useKaraokeStore } from '../store/karaokeStore';

export interface HeaderBarProps {
  readonly title?: string;
  readonly showChromecast?: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ title = 'OPEN KARAOKE', showChromecast = true }) => {
  const chromecastConnected = useKaraokeStore((s) => s.chromecastConnected);
  const toggleChromecast = useKaraokeStore((s) => s.toggleChromecast);
  const isMicMuted = useKaraokeStore((s) => s.isMicMuted);
  const toggleMicMute = useKaraokeStore((s) => s.toggleMicMute);

  return (
    <View className="flex-row items-center justify-between px-5 pt-12 pb-4 bg-surface/90 backdrop-blur-md border-b border-white/10">
      <View className="flex-row items-center space-x-2">
        <Ionicons name="mic-circle" size={28} color="#bd00ff" />
        <Text className="text-xl font-black tracking-wider text-white">
          {title.slice(0, 4)}
          <Text className="text-[#00eefc]">{title.slice(4)}</Text>
        </Text>
      </View>

      <View className="flex-row items-center space-x-3">
        {showChromecast && (
          <TouchableOpacity
            onPress={toggleChromecast}
            className={`px-3 py-1.5 rounded-full flex-row items-center border ${chromecastConnected ? 'bg-[#00eefc]/15 border-[#00eefc]' : 'bg-surface-high border-white/10'
              }`}
          >
            <Ionicons name="tv-outline" size={16} color={chromecastConnected ? '#00eefc' : '#888'} />
            <Text className={`text-xs font-semibold ml-1.5 ${chromecastConnected ? 'text-[#00eefc]' : 'text-gray-400'}`}>
              {chromecastConnected ? 'Cast On' : 'Cast'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={toggleMicMute}
          className={`w-9 h-9 rounded-full items-center justify-center border ml-3 ${isMicMuted ? 'bg-tertiary/20 border-tertiary' : 'bg-primary/20 border-primary'
            }`}
        >
          <Ionicons name={isMicMuted ? 'mic-off' : 'mic'} size={18} color={isMicMuted ? '#e7006e' : '#bd00ff'} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default HeaderBar;
