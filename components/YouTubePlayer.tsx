import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Ionicons } from '@expo/vector-icons';

export interface YouTubePlayerProps {
  /**
   * YouTube link (e.g., "https://www.youtube.com/watch?v=dQw4w9WgXcQ" or "https://youtu.be/dQw4w9WgXcQ") or direct video ID
   */
  videoUrl: string;
  /** Height of the player container (default: 220) */
  height?: number;
  /** Controls playback state (default: true) */
  play?: boolean;
  /** Callback fired when player state changes ('playing', 'paused', 'ended', etc.) */
  onChangeState?: (state: string) => void;
  /** Callback fired when player is loaded and ready */
  onReady?: () => void;
  /** Callback fired when an error occurs */
  onError?: (errorName: string) => void;
}

/**
 * Extracts YouTube video ID from standard YouTube URLs, short URLs, embed links, or raw IDs.
 */
export function extractYouTubeVideoId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // Directly an 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex matching youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, etc.
  const regExp = /^.*(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/;
  const match = trimmed.match(regExp);

  return match && match[1].length === 11 ? match[1] : null;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoUrl,
  height = 220,
  play = true,
  onChangeState,
  onReady,
  onError,
}) => {
  const [playing, setPlaying] = useState<boolean>(play);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    setPlaying(play);
  }, [play]);

  const videoId = extractYouTubeVideoId(videoUrl);

  useEffect(() => {
    setHasError(false);
    setErrorCode(null);
    setIsReady(false);
    setPlaying(play);
  }, [videoId, play]);

  const handleStateChange = useCallback(
    (state: string) => {
      if (state === 'ended') {
        setPlaying(false);
      }
      onChangeState?.(state);
    },
    [onChangeState]
  );

  const handleReady = useCallback(() => {
    setIsReady(true);
    onReady?.();
  }, [onReady]);

  const handleError = useCallback(
    (err: string) => {
      console.warn('[YouTubePlayer] playback error:', err, 'videoId:', videoId);
      setHasError(true);
      setErrorCode(err);
      onError?.(err);
    },
    [onError, videoId]
  );

  const errorMessage =
    errorCode === 'embed_not_allowed'
      ? 'This video cannot be played in the app. Try another karaoke track.'
      : errorCode === 'video_not_found'
        ? 'This video is unavailable or was removed.'
        : 'Unable to play this YouTube video';

  if (!videoId) {
    return (
      <View
        style={{ height }}
        className="bg-surface-container border border-red-500/30 rounded-2xl items-center justify-center p-4"
      >
        <Ionicons name="alert-circle-outline" size={32} color="#ef4444" />
        <Text className="text-red-400 text-sm font-mono mt-2 text-center">
          Invalid YouTube URL or Video ID
        </Text>
        <Text className="text-gray-500 text-xs mt-1 text-center font-mono" numberOfLines={1}>
          {videoUrl ? `Provided: ${videoUrl}` : 'No link provided'}
        </Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View
        style={{ height }}
        className="bg-surface-container border border-tertiary/30 rounded-2xl items-center justify-center p-4"
      >
        <Ionicons name="videocam-off-outline" size={32} color="#e7006e" />
        <Text className="text-tertiary text-sm font-mono mt-2 text-center px-4">
          {errorMessage}
        </Text>
        {videoId && (
          <Text className="text-gray-500 text-[10px] font-mono mt-1 text-center">
            Video ID: {videoId}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View className="rounded-2xl overflow-hidden bg-black relative border border-white/10">
      {!isReady && (
        <View
          style={{ height }}
          className="absolute inset-0 items-center justify-center bg-surface-container z-10"
        >
          <ActivityIndicator size="large" color="#00eefc" />
          <Text className="text-gray-400 text-xs font-mono mt-2">Loading YouTube Player...</Text>
        </View>
      )}

      <YoutubePlayer
        key={videoId}
        height={height}
        play={playing}
        videoId={videoId}
        forceAndroidAutoplay={Platform.OS === 'android'}
        onChangeState={handleStateChange}
        onReady={handleReady}
        onError={handleError}
        initialPlayerParams={{
          preventFullScreen: false,
          showClosedCaptions: false,
          controls: true,
          rel: false,
        }}
        webViewProps={{
          allowsInlineMediaPlayback: true,
          mediaPlaybackRequiresUserAction: false,
          domStorageEnabled: true,
        }}
      />
    </View>
  );
};
