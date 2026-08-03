import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface UserNamePromptModalProps {
  readonly visible: boolean;
  readonly onSubmit: (name: string) => void;
  readonly onSkip: () => void;
  readonly onClose?: () => void;
}

export const UserNamePromptModal: React.FC<UserNamePromptModalProps> = ({
  visible,
  onSubmit,
  onSkip,
  onClose,
}) => {
  const [performerName, setPerformerName] = useState('');
  const [nameError, setNameError] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setPerformerName('');
      setNameError('');
    }
  }, [visible]);

  const handleSubmit = () => {
    if (!performerName.trim()) {
      setNameError('Please enter your name to continue.');
      return;
    }
    onSubmit(performerName.trim());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose || onSkip}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-center items-center bg-black/75 px-6">
          <View className="w-full max-w-sm bg-[#12111a] rounded-3xl border border-[#bd00ff]/35 p-7 shadow-2xl">
            {/* Header with Trophy Icon */}
            <View className="items-center mb-5">
              <View className="w-16 h-16 rounded-full bg-[#bd00ff]/15 border border-[#bd00ff]/50 items-center justify-center mb-3.5">
                <Ionicons name="trophy" size={30} color="#bd00ff" />
              </View>
              <Text className="text-white text-lg font-extrabold tracking-widest text-center font-mono">
                GREAT PERFORMANCE!
              </Text>
              <Text className="text-gray-400 text-xs mt-1.5 text-center leading-5">
                Enter your name to save your score to the leaderboard.
              </Text>
            </View>

            {/* Input Label */}
            <Text className="text-[#bd00ff] text-[10px] font-bold tracking-widest mb-2 font-mono">
              YOUR NAME
            </Text>

            {/* Name Input */}
            <TextInput
              value={performerName}
              onChangeText={(text) => {
                setPerformerName(text);
                if (nameError) setNameError('');
              }}
              placeholder="e.g. Star Vocalist"
              placeholderTextColor="#52525b"
              autoFocus
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              className={`bg-[#1c1a2a] border-2 rounded-xl px-4 py-3.5 text-white text-base font-semibold mb-1 ${
                nameError
                  ? 'border-tertiary'
                  : performerName.trim()
                  ? 'border-[#bd00ff]'
                  : 'border-white/10'
              }`}
            />

            {/* Error Message */}
            {!!nameError && (
              <Text className="text-tertiary text-xs mb-1.5 font-mono">
                {nameError}
              </Text>
            )}

            {/* Character Count */}
            <Text className="text-gray-500 text-[10px] text-right mb-5 font-mono">
              {performerName.length}/30
            </Text>

            {/* Action Buttons */}
            <TouchableOpacity
              onPress={handleSubmit}
              activeOpacity={0.85}
              className="bg-[#bd00ff] rounded-2xl py-3.5 items-center mb-2.5 shadow-lg shadow-purple-500/50"
            >
              <Text className="text-white text-xs font-extrabold tracking-widest font-mono">
                VIEW MY SCORE →
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onSkip}
              activeOpacity={0.7}
              className="py-2.5 items-center"
            >
              <Text className="text-gray-500 text-[11px] tracking-wider font-mono">
                CANCEL
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default UserNamePromptModal;
