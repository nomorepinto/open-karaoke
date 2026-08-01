export interface MicMonitorConfig {
  /**
   * Audio mode & routing pipeline:
   *  - 'communication': Uses MODE_IN_COMMUNICATION + VoiceCommunication usage.
   *                     Provides lowest latency on many devices, but uses Call Volume.
   *  - 'media': Uses MODE_NORMAL + Media usage.
   *             Uses standard Media Volume and main loudspeaker.
   */
  mode: 'communication' | 'media';

  /**
   * Target audio sample rate in Hz (e.g. 48000, 44100, or 0 for auto native hardware rate).
   * Modern Android hardware natively runs at 48000 Hz.
   */
  sampleRate: number;

  /**
   * Default software gain multiplier applied to microphone audio.
   * 1.0 = unity (no amplification), 2.0 = +6dB, 12.0 = +21.5dB.
   */
  gain: number;
}

/**
 * Default configuration for the Mic Monitor.
 * Change properties here to toggle behavior project-wide.
 */
export const DEFAULT_MIC_MONITOR_CONFIG: MicMonitorConfig = {
  mode: 'media', // Change to 'media' if you prefer standard media volume
  sampleRate: 48000,
  gain: 4.0,
};
