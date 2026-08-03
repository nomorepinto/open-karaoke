"""
Pitch Stability Analyzer Module.

Conceptual Description:
-----------------------
Pitch Stability measures how cleanly and consistently a singer sustains pitch within individual note phrases
without unwanted micro-wobble, intonation drift, or shaky vocal control.

Because there is NO target melody or expected musical score (no ground truth note cues), this metric evaluates
SELF-REFERENTIAL STABILITY: the variance of pitch contour (in cents) relative to the singer's OWN local mean pitch
within each auto-detected sustained note segment.

A perfect sustained tone with minimal variance yields a score approaching 100. High pitch flutter or unstable pitch
swings lower the score.
"""
import numpy as np
from typing import List, Dict, Any
from app.analysis.segmentation import SustainedNoteSegment


def compute_pitch_stability_score(
    segments: List[SustainedNoteSegment],
    decay_factor: float = 0.005  # Sensitivity scaling factor for cents variance
) -> float:
    """
    Computes overall Pitch Stability score (0 - 100 scale) aggregated across all note segments.

    Formula:
        For each segment i:
            SegmentScore_i = 100 * exp(-decay_factor * pitch_variance_cents_i)
        TotalScore = Duration-weighted average of SegmentScore_i across all segments.

    Args:
        segments: List of SustainedNoteSegment objects.
        decay_factor: Sensitivity multiplier for exponential decay.

    Returns:
        Pitch stability score between 0.0 and 100.0.
    """
    if not segments:
        # Default baseline score if no sustained notes detected (e.g. ambient silence/spoken audio)
        return 50.0

    weighted_score_sum = 0.0
    total_duration = 0.0

    for seg in segments:
        # Calculate cents variance if not already pre-calculated
        valid_midi = seg.f0_contour_midi[~np.isnan(seg.f0_contour_midi)]
        if len(valid_midi) > 1:
            var_semitones = float(np.var(valid_midi))
            # 1 semitone = 100 cents, so variance in cents^2 = var_semitones * 10000
            cents_var = var_semitones * 10000.0
        else:
            cents_var = 0.0

        # Exponential decay mapping: 0 variance -> 100 score; 200 cents^2 var -> ~36 score
        seg_score = 100.0 * np.exp(-decay_factor * cents_var)
        seg_score = float(np.clip(seg_score, 0.0, 100.0))

        weighted_score_sum += seg_score * seg.duration
        total_duration += seg.duration

    if total_duration <= 0:
        return 50.0

    final_score = weighted_score_sum / total_duration
    return float(np.clip(round(final_score, 2), 0.0, 100.0))
