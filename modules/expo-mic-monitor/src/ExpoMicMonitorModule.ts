import { requireNativeModule } from 'expo-modules-core';

/**
 * The native ExpoMicMonitor module, loaded via JSI (New Architecture).
 *
 * This object exposes:
 *   - start(): Promise<boolean>   — opens Oboe streams, returns success
 *   - stop(): void               — tears down streams and releases audio focus
 *   - setMuted(muted: boolean): void — atomically toggles silence in the audio callback
 */
const ExpoMicMonitor = requireNativeModule('ExpoMicMonitor');

export async function start(): Promise<boolean> {
  return await ExpoMicMonitor.start();
}

export function stop(): void {
  ExpoMicMonitor.stop();
}

export function setMuted(muted: boolean): void {
  ExpoMicMonitor.setMuted(muted);
}

/**
 * Set the gain (volume multiplier) applied to the mic passthrough.
 *
 * @param gain - Multiplier: 1.0 = unity, 2.0 = +6dB, 0.5 = -6dB.
 *               Clamped to [0.0, 8.0] on the native side.
 *               Default is 2.0 (+6dB) which compensates for the lack
 *               of hardware AGC when using VoicePerformance preset.
 */
export function setGain(gain: number): void {
  ExpoMicMonitor.setGain(gain);
}
