"""
Service Module: Scoring Orchestrator.

scoring_service.py is the SINGLE COMPOSITION LAYER that composes all 4 audio analyzers together:
1. Runs shared instrumental BeatGrid extraction (app.analysis.beat_grid).
2. Runs shared sustained-note segmentation on the vocal track (app.analysis.segmentation).
3. Computes Pitch Stability (app.analysis.pitch).
4. Computes Rhythm Accuracy (app.analysis.rhythm).
5. Computes Volume Consistency (app.analysis.volume).
6. Computes Sustain Consistency (app.analysis.sustain).
7. Aggregates composite total score based on configured weighting.
"""
from typing import List, Tuple, Dict, Any
import numpy as np
from app.analysis.segmentation import detect_sustained_note_segments, SustainedNoteSegment
from app.analysis.beat_grid import extract_beat_grid, BeatGrid
from app.analysis.pitch import compute_pitch_stability_score
from app.analysis.rhythm import compute_rhythm_accuracy_score
from app.analysis.volume import compute_volume_consistency_score
from app.analysis.sustain import compute_sustain_consistency_score
from app.models.schemas import MetricScores, SegmentDetail
from app.core.config import settings
from app.core.logging import logger


def process_and_score_performance(
    y_vocal: np.ndarray,
    y_instrumental: np.ndarray,
    sr: int
) -> Tuple[MetricScores, float, List[SegmentDetail]]:
    """
    Executes the complete audio scoring pipeline given vocal and instrumental signals.

    Args:
        y_vocal: Vocal audio recording array.
        y_instrumental: Instrumental backing track audio array.
        sr: Sample rate in Hz.

    Returns:
        (MetricScores, total_composite_score, list_of_segment_details)
    """
    logger.info("Extracting shared instrumental BeatGrid...")
    beat_grid = extract_beat_grid(y_instrumental, sr=sr)

    logger.info("Extracting shared vocal sustained-note segments...")
    segments, f0_hz, voiced_flag, f0_midi = detect_sustained_note_segments(y_vocal, sr=sr)

    logger.info(f"Detected {len(segments)} sustained note segments. Running 4 analyzers...")

    # Analyzer 1: Pitch Stability
    pitch_score = compute_pitch_stability_score(segments)

    # Analyzer 2: Rhythm Accuracy
    rhythm_score = compute_rhythm_accuracy_score(y_vocal, sr=sr, beat_grid=beat_grid)

    # Analyzer 3: Volume Consistency
    volume_score = compute_volume_consistency_score(y_vocal, sr=sr)

    # Analyzer 4: Sustain Consistency
    sustain_score = compute_sustain_consistency_score(segments, beat_grid=beat_grid)

    metric_scores = MetricScores(
        pitch_stability=pitch_score,
        rhythm_accuracy=rhythm_score,
        volume_consistency=volume_score,
        sustain_consistency=sustain_score
    )

    # Composite overall score calculation (weighted sum)
    total_score = (
        settings.WEIGHT_PITCH * pitch_score +
        settings.WEIGHT_RHYTHM * rhythm_score +
        settings.WEIGHT_VOLUME * volume_score +
        settings.WEIGHT_SUSTAIN * sustain_score
    )
    total_score = float(np.clip(round(total_score, 2), 0.0, 100.0))

    # Build SegmentDetail list for UI curve visualization
    segment_details: List[SegmentDetail] = []
    for seg in segments:
        dur_beats = beat_grid.seconds_to_beats(seg.duration)
        detail = SegmentDetail(
            segment_index=seg.segment_index,
            start_time=round(seg.start_time, 3),
            end_time=round(seg.end_time, 3),
            duration=round(seg.duration, 3),
            duration_beats=round(dur_beats, 2),
            mean_pitch_hz=round(seg.mean_f0_hz, 1),
            mean_pitch_midi=round(seg.mean_f0_midi, 1),
            pitch_variance_cents=round(seg.pitch_variance_cents, 2)
        )
        segment_details.append(detail)

    logger.info(
        f"Scoring pipeline complete. Composite Total Score={total_score:.1f} "
        f"(Pitch={pitch_score}, Rhythm={rhythm_score}, Vol={volume_score}, Sust={sustain_score})"
    )

    return metric_scores, total_score, segment_details
