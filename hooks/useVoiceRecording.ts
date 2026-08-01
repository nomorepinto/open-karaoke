import { useState, useCallback, useEffect, useRef } from 'react';
import { useAudioRecorder, useAudioRecorderState, RecordingPresets } from 'expo-audio';
import * as FileSystem from 'expo-file-system';

export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopped';

export interface UseVoiceRecordingOptions {
  /** Whether the YouTube video is currently playing */
  isVideoPlaying: boolean;
  /** Whether Chromecast is connected (manual mode) */
  chromecastConnected: boolean;
}

export interface UseVoiceRecordingReturn {
  readonly recordingStatus: RecordingStatus;
  readonly recordingUri: string | null;
  readonly durationMillis: number;
  readonly hasRecording: boolean;
  readonly startRecording: () => Promise<void>;
  readonly pauseRecording: () => Promise<void>;
  readonly resumeRecording: () => Promise<void>;
  readonly stopRecording: () => Promise<void>;
  readonly deleteRecording: () => Promise<void>;
}

/**
 * useVoiceRecording — Custom hook for recording the user's voice during karaoke.
 *
 * Supports two modes:
 *  - Non-Chromecast: recording auto-syncs with YouTube video play/pause
 *  - Chromecast: recording is fully manual via UI buttons
 *
 * Supports pause/resume without ending the recording session.
 */
export function useVoiceRecording({
  isVideoPlaying,
  chromecastConnected,
}: UseVoiceRecordingOptions): UseVoiceRecordingReturn {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 500);

  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  // Track whether we've ever started a recording in this session
  // (so we know to resume vs start fresh)
  const hasStartedRef = useRef(false);

  // Track previous video playing state for edge detection
  const prevVideoPlayingRef = useRef(false);

  // Duration in milliseconds from the recorder state
  const durationMillis = recorderState.durationMillis ?? 0;

  // Whether a recording file exists for playback
  const hasRecording = recordingUri !== null || recordingStatus === 'recording' || recordingStatus === 'paused';

  // ── Start Recording ─────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      if (recordingStatus !== 'idle') return;

      // Clear any previous recording URI
      setRecordingUri(null);

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      hasStartedRef.current = true;
      setRecordingStatus('recording');
    } catch (err) {
      console.error('[useVoiceRecording] startRecording failed:', err);
    }
  }, [audioRecorder, recordingStatus]);

  // ── Pause Recording (keeps session alive) ───────────────────────────
  const pauseRecording = useCallback(async () => {
    try {
      if (recordingStatus !== 'recording') return;

      audioRecorder.pause();
      setRecordingStatus('paused');
    } catch (err) {
      console.error('[useVoiceRecording] pauseRecording failed:', err);
    }
  }, [audioRecorder, recordingStatus]);

  // ── Resume Recording ────────────────────────────────────────────────
  const resumeRecording = useCallback(async () => {
    try {
      if (recordingStatus !== 'paused') return;

      audioRecorder.record();
      setRecordingStatus('recording');
    } catch (err) {
      console.error('[useVoiceRecording] resumeRecording failed:', err);
    }
  }, [audioRecorder, recordingStatus]);

  // ── Stop Recording ──────────────────────────────────────────────────
  const stopRecording = useCallback(async () => {
    try {
      if (recordingStatus !== 'recording' && recordingStatus !== 'paused') return;

      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (uri) {
        setRecordingUri(uri);
      }
      hasStartedRef.current = false;
      setRecordingStatus('stopped');
    } catch (err) {
      console.error('[useVoiceRecording] stopRecording failed:', err);
    }
  }, [audioRecorder, recordingStatus]);

  // ── Delete Recording & Reset ────────────────────────────────────────
  const deleteRecording = useCallback(async () => {
    try {
      if (recordingUri) {
        const fileInfo = await FileSystem.getInfoAsync(recordingUri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(recordingUri, { idempotent: true });
        }
      }
    } catch (err) {
      console.error('[useVoiceRecording] deleteRecording failed:', err);
    } finally {
      setRecordingUri(null);
      hasStartedRef.current = false;
      setRecordingStatus('idle');
    }
  }, [recordingUri]);

  // ── Auto-sync with YouTube video (Non-Chromecast mode) ──────────────
  useEffect(() => {
    if (chromecastConnected) {
      // In Chromecast mode, recording is manual — don't auto-sync
      prevVideoPlayingRef.current = isVideoPlaying;
      return;
    }

    const wasPlaying = prevVideoPlayingRef.current;
    prevVideoPlayingRef.current = isVideoPlaying;

    // Edge detection: only act on transitions
    if (isVideoPlaying === wasPlaying) return;

    if (isVideoPlaying) {
      // Video started playing
      if (!hasStartedRef.current) {
        // First time — start a new recording
        startRecording();
      } else if (recordingStatus === 'paused') {
        // Resume existing recording
        resumeRecording();
      }
    } else {
      // Video paused
      if (recordingStatus === 'recording') {
        pauseRecording();
      }
    }
  }, [
    isVideoPlaying,
    chromecastConnected,
    recordingStatus,
    startRecording,
    pauseRecording,
    resumeRecording,
  ]);

  return {
    recordingStatus,
    recordingUri,
    durationMillis,
    hasRecording,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    deleteRecording,
  } as const;
}
