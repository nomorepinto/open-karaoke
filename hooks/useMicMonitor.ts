import { useState, useCallback, useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { start, stop, setMuted, setGain, MicMonitorConfig } from '../modules/expo-mic-monitor';
import { useKaraokeStore } from '../store/karaokeStore';

/**
 * useMicMonitor — drop-in replacement for the WebRTC loopback hook.
 * Synced with useKaraokeStore for app-wide microphone mute state management.
 */
export function useMicMonitor() {
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isMuted = useKaraokeStore((s) => s.isMicMuted);
  const toggleMicMuteInStore = useKaraokeStore((s) => s.toggleMicMute);

  const micGain = useKaraokeStore((s) => s.micGain);

  // Sync native mute state whenever isMuted or isMonitoring changes
  useEffect(() => {
    if (isMonitoring) {
      try {
        setMuted(isMuted);
      } catch (err: any) {
        console.error('[useMicMonitor] setMuted sync failed:', err);
      }
    }
  }, [isMuted, isMonitoring]);

  // Sync native gain state whenever micGain or isMonitoring changes
  useEffect(() => {
    if (isMonitoring) {
      try {
        setGain(micGain);
      } catch (err: any) {
        console.error('[useMicMonitor] setGain sync failed:', err);
      }
    }
  }, [micGain, isMonitoring]);

  // ── Stop ─────────────────────────────────────────────────────────
  const stopMonitoring = useCallback(() => {
    try {
      stop();
    } catch {
      // Best-effort cleanup; swallow errors.
    }
    setIsMonitoring(false);
  }, []);

  // ── Start ────────────────────────────────────────────────────────
  const startMonitoring = useCallback(async (config?: Partial<MicMonitorConfig>) => {
    try {
      setError(null);

      // Ensure we're on Android (this module is Android-only).
      if (Platform.OS !== 'android') {
        throw new Error(
          'expo-mic-monitor is Android-only. Use AVAudioEngine on iOS.'
        );
      }

      // Request RECORD_AUDIO permission before touching native code.
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message:
            'This app needs microphone access for real-time vocal monitoring.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new Error(
          'Microphone permission denied. Enable it in Settings to use mic monitoring.'
        );
      }

      // Stop any existing session first (idempotent).
      stopMonitoring();

      // Fire up the Oboe engine with custom or default config.
      const success = await start(config);
      if (success) {
        setIsMonitoring(true);
      } else {
        throw new Error(
          'Failed to start the audio engine. Check logcat for details.'
        );
      }
    } catch (err: any) {
      console.error('[useMicMonitor] startMonitoring failed:', err);
      setError(err.message || 'Failed to initialise mic monitor.');
      stopMonitoring();
    }
  }, [stopMonitoring]);

  // ── Toggle mute ──────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    toggleMicMuteInStore();
  }, [toggleMicMuteInStore]);

  // ── Cleanup on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    isMonitoring,
    isMuted,
    error,
    startMonitoring,
    stopMonitoring,
    toggleMute,
    setGain,
  } as const;
}
