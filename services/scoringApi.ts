/**
 * Karaoke scoring API client for the booth tablet flow.
 */
import { File, UploadType } from 'expo-file-system';
import { ScoreBreakdown } from '../data/mockData';

const DEFAULT_API_BASE =
  'https://9qe3669wq1.execute-api.ap-southeast-1.amazonaws.com/prod';

export const SCORING_API_BASE = (
  process.env.EXPO_PUBLIC_SCORING_API_URL ?? DEFAULT_API_BASE
).replace(/\/$/, '');

export interface MetricScores {
  pitch_stability: number;
  rhythm_accuracy: number;
  volume_consistency: number;
  sustain_consistency: number;
}

export interface SegmentDetail {
  segment_index: number;
  start_time: number;
  end_time: number;
  duration: number;
  duration_beats: number;
  mean_pitch_hz: number;
  mean_pitch_midi: number;
  pitch_variance_cents: number;
}

export interface ScoreApiResponse {
  record_id: number;
  user_id: number;
  song_id: number;
  s3_link: string;
  total_score: number;
  scores: MetricScores;
  segment_details: SegmentDetail[] | null;
  created_at: string;
}

export interface BoothUserResponse {
  user_id: number;
  name: string;
}

export interface BoothSongResponse {
  song_id: number;
  title: string;
}

export interface BoothUploadResponse {
  s3_key: string;
  bucket: string;
  bytes_uploaded: number;
}

class ScoringApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ScoringApiError';
    this.status = status;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${SCORING_API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      detail = body.detail ?? body.message ?? detail;
      if (typeof detail !== 'string') {
        detail = JSON.stringify(detail);
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new ScoringApiError(detail, response.status);
  }

  return response.json() as Promise<T>;
}

export function inferRecordingMeta(recordingUri: string): {
  fileExtension: string;
  contentType: string;
} {
  const lower = recordingUri.toLowerCase();
  if (lower.includes('.wav')) {
    return { fileExtension: 'wav', contentType: 'audio/wav' };
  }
  if (lower.includes('.caf')) {
    return { fileExtension: 'caf', contentType: 'audio/x-caf' };
  }
  if (lower.includes('.3gp')) {
    return { fileExtension: '3gp', contentType: 'audio/3gpp' };
  }
  return { fileExtension: 'm4a', contentType: 'audio/mp4' };
}

export async function registerBoothUser(name: string): Promise<BoothUserResponse> {
  return apiFetch<BoothUserResponse>('/booth/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export async function registerBoothSong(title: string): Promise<BoothSongResponse> {
  return apiFetch<BoothSongResponse>('/booth/songs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
}

export async function uploadRecordingViaApi(params: {
  recordingUri: string;
  userId: number;
  songId: number;
}): Promise<BoothUploadResponse> {
  const { contentType } = inferRecordingMeta(params.recordingUri);
  const file = new File(params.recordingUri);

  const result = await file.upload(`${SCORING_API_BASE}/booth/upload`, {
    httpMethod: 'POST',
    uploadType: UploadType.MULTIPART,
    fieldName: 'file',
    mimeType: contentType,
    parameters: {
      user_id: String(params.userId),
      song_id: String(params.songId),
    },
  });

  if (result.status < 200 || result.status >= 300) {
    let detail = `Upload failed (${result.status})`;
    if (result.body) {
      try {
        const body = JSON.parse(result.body) as { detail?: string };
        detail = body.detail ?? `${detail}. ${result.body}`;
      } catch {
        detail = `${detail}. ${result.body}`;
      }
    }
    throw new ScoringApiError(detail, result.status);
  }

  return JSON.parse(result.body) as BoothUploadResponse;
}

export async function submitScore(params: {
  userId: number;
  songId: number;
  s3Key: string;
}): Promise<ScoreApiResponse> {
  return apiFetch<ScoreApiResponse>('/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: params.userId,
      song_id: params.songId,
      s3_link: params.s3Key,
    }),
  });
}

function gradeFromScore(score: number): ScoreBreakdown['grade'] {
  if (score >= 95) return 'SS';
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  return 'C';
}

function rankTitleFromScore(score: number): string {
  if (score >= 95) return 'Grand Karaoke Master';
  if (score >= 90) return 'Star Performer';
  if (score >= 80) return 'Rising Vocalist';
  if (score >= 70) return 'Stage Rookie';
  return 'Warm-Up Warrior';
}

export function mapScoreResponseToBreakdown(response: ScoreApiResponse): ScoreBreakdown {
  const segmentCount = response.segment_details?.length ?? 0;

  return {
    totalScore: Math.round(response.total_score * 10) / 10,
    grade: gradeFromScore(response.total_score),
    pitchAccuracy: Math.round(response.scores.pitch_stability * 10) / 10,
    rhythmPrecision: Math.round(response.scores.rhythm_accuracy * 10) / 10,
    toneQuality: Math.round(response.scores.volume_consistency * 10) / 10,
    vibratoBonus: Math.round(response.scores.sustain_consistency),
    maxCombo: segmentCount,
    rankTitle: rankTitleFromScore(response.total_score),
  };
}

export type BoothPipelineStage =
  | 'registering'
  | 'uploading'
  | 'scoring'
  | 'done'
  | 'error';

export async function runBoothScoringPipeline(params: {
  performerName: string;
  songTitle: string;
  recordingUri: string;
  onStageChange?: (stage: BoothPipelineStage) => void;
}): Promise<ScoreApiResponse> {
  params.onStageChange?.('registering');
  const [user, song] = await Promise.all([
    registerBoothUser(params.performerName),
    registerBoothSong(params.songTitle),
  ]);

  params.onStageChange?.('uploading');
  const upload = await uploadRecordingViaApi({
    recordingUri: params.recordingUri,
    userId: user.user_id,
    songId: song.song_id,
  });

  params.onStageChange?.('scoring');
  const score = await submitScore({
    userId: user.user_id,
    songId: song.song_id,
    s3Key: upload.s3_key,
  });

  params.onStageChange?.('done');
  return score;
}

export { ScoringApiError };
