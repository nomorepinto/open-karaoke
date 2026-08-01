import { requireNativeModule } from 'expo-modules-core';
import { MicMonitorConfig, DEFAULT_MIC_MONITOR_CONFIG } from './config';

const ExpoMicMonitor = requireNativeModule('ExpoMicMonitor');

export async function start(config?: Partial<MicMonitorConfig>): Promise<boolean> {
  const mergedConfig = { ...DEFAULT_MIC_MONITOR_CONFIG, ...config };
  return await ExpoMicMonitor.start(mergedConfig);
}

export function stop(): void {
  ExpoMicMonitor.stop();
}

export function setMuted(muted: boolean): void {
  ExpoMicMonitor.setMuted(muted);
}

export function setGain(gain: number): void {
  ExpoMicMonitor.setGain(gain);
}
