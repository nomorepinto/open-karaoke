"""
Sustain Consistency Analyzer Module.

Conceptual Description:
-----------------------
Sustain Consistency measures the duration regularity, breath management control, and musical plausibility
of sustained vocal notes relative to the instrumental song's tempo.

Without ground truth note duration score cues, this metric evaluates SELF-REFERENTIAL DURATION PLAUSIBILITY:
1. Reuses the auto-detected SustainedNoteSegment array from pitch segmentation.
2. Expresses each note segment's duration in musical beats using the instrumental's BeatGrid tempo.
3. Evaluates quantization closeness to natural musical note duration subdivisions (e.g., 0.5 beat = 8th note,
   1.0 beat = quarter note, 2.0 beats = half note, 4.0 beats = whole note) and measures duration variance.
4. Returns a 0 - 100 quality score.

A vocalist who holds notes for musically sensible, rhythmic durations scores high (~100); fragmented, erratic, or
chopped-up note holds yield a lower score.
"""
import numpy as np
from typing import List
from app.analysis.segmentation import SustainedNoteSegment
from app.analysis.beat_grid import BeatGrid


def compute_sustain_consistency_score(
    segments: List[SustainedNoteSegment],
    beat_grid: BeatGrid
) -> float:
    """
    Computes overall Sustain Consistency score (0 - 100 scale) from note durations expressed in musical beats.

    Args:
        segments: List of auto-detected SustainedNoteSegment objects.
        beat_grid: Instrumental BeatGrid object containing tempo (BPM).

    Returns:
        Sustain consistency score between 0.0 and 100.0.
    """
    if not segments:
        return 50.0

    beat_durations: List[float] = []
    quant_errors: List[float] = []

    # Common musical beat subdivisions: [0.25 (16th), 0.5 (8th), 1.0 (quarter), 1.5 (dotted 8th/qtr), 2.0 (half), 3.0, 4.0 (whole)]
    valid_subdivisions = np.array([0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0, 6.0, 8.0])

    for seg in segments:
        dur_beats = beat_grid.seconds_to_beats(seg.duration)
        beat_durations.append(dur_beats)

        # Distance to closest musical subdivision
        min_diff = float(np.min(np.abs(valid_subdivisions - dur_beats)))
        quant_errors.append(min_diff)

    if not beat_durations:
        return 50.0

    mean_quant_error = float(np.mean(quant_errors))
    
    # Evaluate duration plausibility score based on quantization error to musical grid
    # 0 beat error -> 100 score; 0.25 beat error -> ~60 score
    quant_score = 100.0 * np.exp(-2.0 * mean_quant_error)

    # Evaluate note duration variance consistency across performance
    if len(beat_durations) > 1:
        std_beats = float(np.std(beat_durations))
        # Penalty if notes are wildly erratic or micro-chopped
        regularity_multiplier = float(np.exp(-0.15 * max(0.0, std_beats - 3.0)))
    else:
        regularity_multiplier = 1.0

    final_score = quant_score * regularity_multiplier
    return float(np.clip(round(final_score, 2), 0.0, 100.0))
