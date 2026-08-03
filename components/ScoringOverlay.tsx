import React from 'react';
import { Modal, View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BoothPipelineStage } from '../services/scoringApi';

export interface ScoringOverlayProps {
  readonly visible: boolean;
  readonly stage: BoothPipelineStage;
  readonly performerName?: string;
  readonly errorMessage?: string | null;
}

function stageCopy(stage: BoothPipelineStage, performerName?: string): { title: string; subtitle: string } {
  switch (stage) {
    case 'registering':
      return {
        title: 'Saving your name…',
        subtitle: performerName
          ? `Registering ${performerName} for scoring`
          : 'Preparing your booth session',
      };
    case 'uploading':
      return {
        title: 'Uploading performance…',
        subtitle: 'Sending your vocal recording to the cloud',
      };
    case 'scoring':
      return {
        title: 'Analyzing your vocals…',
        subtitle: 'This can take up to 30 seconds on first run',
      };
    case 'done':
      return {
        title: 'Score ready!',
        subtitle: 'Opening your results',
      };
    case 'error':
      return {
        title: 'Scoring failed',
        subtitle: 'Please try again or ask a booth attendant',
      };
    default:
      return { title: 'Working…', subtitle: '' };
  }
}

export const ScoringOverlay: React.FC<ScoringOverlayProps> = ({
  visible,
  stage,
  performerName,
  errorMessage,
}) => {
  const copy = stageCopy(stage, performerName);
  const isError = stage === 'error';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View className="flex-1 bg-black/80 items-center justify-center px-8">
        <View className="w-full max-w-sm bg-[#12111a] rounded-3xl border border-[#bd00ff]/35 p-8 items-center">
          {isError ? (
            <View className="w-16 h-16 rounded-full bg-tertiary/15 border border-tertiary/50 items-center justify-center mb-4">
              <Ionicons name="alert-circle" size={32} color="#e7006e" />
            </View>
          ) : (
            <ActivityIndicator size="large" color="#bd00ff" className="mb-4" />
          )}

          <Text className="text-white text-lg font-extrabold tracking-widest text-center font-mono mb-2">
            {copy.title}
          </Text>
          <Text className="text-gray-400 text-xs text-center leading-5">
            {errorMessage ?? copy.subtitle}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

export default ScoringOverlay;
