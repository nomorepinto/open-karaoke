import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';

let webrtc: any = null;
try {
  webrtc = require('react-native-webrtc');
} catch (e) {
  console.warn('react-native-webrtc not available or pending bundler restart', e);
}

export function useMicMonitor() {
  const [stream, setStream] = useState<any | null>(null);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const pc1Ref = useRef<any | null>(null);
  const pc2Ref = useRef<any | null>(null);
  const localStreamRef = useRef<any | null>(null);

  const stopMonitoring = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: any) => track.stop());
      localStreamRef.current = null;
    }

    if (pc1Ref.current) {
      pc1Ref.current.close();
      pc1Ref.current = null;
    }

    if (pc2Ref.current) {
      pc2Ref.current.close();
      pc2Ref.current = null;
    }

    setStream(null);
    setIsMonitoring(false);
    setIsMuted(false);
  }, []);

  const startMonitoring = useCallback(async () => {
    try {
      setError(null);
      stopMonitoring();

      let localStream: any;
      let PeerConnectionClass: any;

      // Raw, unprocessed audio constraints — AEC/NS/AGC are tuned for voice
      // calls, not live vocal monitoring, and add latency + coloration.
      const audioConstraints = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      };

      if (Platform.OS === 'web') {
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error('WebRTC getUserMedia not supported in this browser.');
        }
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: false,
        });
        PeerConnectionClass = (window as any).RTCPeerConnection;
      } else {
        if (!webrtc?.mediaDevices?.getUserMedia) {
          throw new Error('react-native-webrtc native module is missing or Metro cache needs restart (npx expo start -c).');
        }
        localStream = await webrtc.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: false,
        });
        PeerConnectionClass = webrtc.RTCPeerConnection;
      }

      localStreamRef.current = localStream;

      const pc1 = new PeerConnectionClass();
      const pc2 = new PeerConnectionClass();

      pc1Ref.current = pc1;
      pc2Ref.current = pc2;

      pc1.onicecandidate = (e: any) => {
        if (e.candidate && pc2Ref.current) {
          pc2Ref.current.addIceCandidate(e.candidate).catch(console.error);
        }
      };

      pc2.onicecandidate = (e: any) => {
        if (e.candidate && pc1Ref.current) {
          pc1Ref.current.addIceCandidate(e.candidate).catch(console.error);
        }
      };

      localStream.getTracks().forEach((track: any) => {
        pc1.addTrack(track, localStream);
      });

      pc2.ontrack = (event: any) => {
        if (event.streams && event.streams[0]) {
          const monitorStream = event.streams[0];
          setStream(monitorStream);
          setIsMonitoring(true);
        }
      };

      const offer = await pc1.createOffer();
      await pc1.setLocalDescription(offer);
      await pc2.setRemoteDescription(offer);

      const answer = await pc2.createAnswer();
      await pc2.setLocalDescription(answer);
      await pc1.setRemoteDescription(answer);
    } catch (err: any) {
      console.error('Error setting up mic monitor loopback:', err);
      setError(err.message || 'Failed to initialize microphone loopback.');
      stopMonitoring();
    }
  }, [stopMonitoring]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      const newMuteState = !isMuted;
      audioTracks.forEach((track: any) => {
        track.enabled = !newMuteState;
      });
      setIsMuted(newMuteState);
    }
  }, [isMuted]);

  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    // Raw MediaStream — consuming component decides how to render it
    // per-platform (RTCView on native, <audio srcObject> on web).
    // Don't rely on stream.toURL() here; it doesn't exist on web.
    stream,
    isMonitoring,
    isMuted,
    error,
    startMonitoring,
    stopMonitoring,
    toggleMute,
  };
}