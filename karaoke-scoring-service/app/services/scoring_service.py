"""
Service Module: Scoring Orchestrator.

Active metrics: Pitch Stability + Volume Consistency (vocal-only pipeline).
Rhythm and Sustain analyzers are retained in app/analysis/ but not invoked here.
"""
from typing import List, Tuple

import numpy as np

from app.analysis.pitch import compute_pitch_stability_score
from app.analysis.segmentation import detect_sustained_note_segments
from app.analysis.volume import compute_volume_consistency_score
from app.core.config import settings
from app.core.logging import logger
from app.models.schemas import MetricScores, SegmentDetail

# Display-only default tempo for segment duration_beats (no instrumental beat grid).
_DEFAULT_TEMPO_BPM = 120.0


def process_and_score_performance(
    y_vocal: np.ndarray,
    sr: int,
) -> Tuple[MetricScores, float, List[SegmentDetail]]:
    """
    Executes the vocal-only scoring pipeline (pitch + volume).

    Args:
        y_vocal: Vocal audio recording array.
        sr: Sample rate in Hz.

    Returns:
        (MetricScores, total_composite_score, list_of_segment_details)
    """
    logger.info("Extracting vocal sustained-note segments...")
    segments, _, _, _ = detect_sustained_note_segments(y_vocal, sr=sr)

    logger.info(f"Detected {len(segments)} sustained note segments. Running pitch + volume analyzers...")

    pitch_score = compute_pitch_stability_score(segments)
    volume_score = compute_volume_consistency_score(y_vocal, sr=sr)

    metric_scores = MetricScores(
        pitch_stability=pitch_score,
        rhythm_accuracy=0.0,
        volume_consistency=volume_score,
        sustain_consistency=0.0,
    )

    total_score = (
        settings.WEIGHT_PITCH * pitch_score
        + settings.WEIGHT_VOLUME * volume_score
    )
    total_score = float(np.clip(round(total_score, 2), 0.0, 100.0))

    seconds_per_beat = 60.0 / _DEFAULT_TEMPO_BPM
    segment_details: List[SegmentDetail] = []
    for seg in segments:
        detail = SegmentDetail(
            segment_index=seg.segment_index,
            start_time=round(seg.start_time, 3),
            end_time=round(seg.end_time, 3),
            duration=round(seg.duration, 3),
            duration_beats=round(seg.duration / seconds_per_beat, 2),
            mean_pitch_hz=round(seg.mean_f0_hz, 1),
            mean_pitch_midi=round(seg.mean_f0_midi, 1),
            pitch_variance_cents=round(seg.pitch_variance_cents, 2),
        )
        segment_details.append(detail)

    logger.info(
        f"Scoring pipeline complete. Composite Total Score={total_score:.1f} "
        f"(Pitch={pitch_score}, Vol={volume_score})"
    )

    return metric_scores, total_score, segment_details
