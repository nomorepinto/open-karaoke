"""
Rhythm Accuracy Analyzer Module.

Conceptual Description:
-----------------------
Rhythm Accuracy measures how closely a singer's vocal note attacks align with the rhythmic pulse (beats and
subdivisions) of the instrumental backing track.

Because there are NO lyric timestamps or note cue files, this metric evaluates SELF-REFERENTIAL BEAT ALIGNMENT:
1. Detects vocal onset timestamps (attacks) from the singer's voice recording using librosa.onset.onset_detect.
2. Measures the absolute timing distance (in milliseconds) from each vocal onset to the nearest 8th-note beat
   subdivision in the instrumental's BeatGrid.
3. Converts average timing error into a normalized 0 - 100 quality score.

A vocalist who sings tight in-tempo on the beat scores near 100; off-beat or dragging/rushing vocals score lower.
"""
import numpy as np
import librosa
from typing import List, Tuple
from app.analysis.beat_grid import BeatGrid


def compute_rhythm_accuracy_score(
    y_vocal: np.ndarray,
    sr: int,
    beat_grid: BeatGrid,
    hop_length: int = 512,
    decay_rate: float = 12.0  # Sensitivity factor: ~50ms average offset -> ~55 score, 100ms -> ~30 score
) -> float:
    """
    Computes overall Rhythm Accuracy score (0 - 100 scale) based on vocal onset alignment to beat grid.

    Args:
        y_vocal: Vocal audio signal array.
        sr: Sample rate in Hz.
        beat_grid: Instrumental BeatGrid object containing tempo and subdivision timestamps.
        hop_length: Hop length for STFT onset detection.
        decay_rate: Exponential decay multiplier for timing offsets (in seconds).

    Returns:
        Rhythm accuracy score between 0.0 and 100.0.
    """
    if len(y_vocal) < sr * 0.5 or len(beat_grid.subdivision_times) == 0:
        return 50.0

    # Detect vocal attack timestamps (onset detection with backtracking to capture start of note)
    onset_frames = librosa.onset.onset_detect(
        y=y_vocal,
        sr=sr,
        hop_length=hop_length,
        backtrack=True,
        units='frames'
    )

    if len(onset_frames) == 0:
        return 50.0

    onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=hop_length)

    # Compute absolute timing offset for each onset relative to nearest beat subdivision
    offsets_sec: List[float] = []
    for t_onset in onset_times:
        abs_offset, _ = beat_grid.get_nearest_beat_offset(t_onset)
        offsets_sec.append(abs_offset)

    if not offsets_sec:
        return 50.0

    mean_offset = float(np.mean(offsets_sec))

    # Exponential decay mapping: 0ms offset -> 100; 50ms (0.05s) offset -> 100 * exp(-12 * 0.05) = ~54.8
    score = 100.0 * np.exp(-decay_rate * mean_offset)
    return float(np.clip(round(score, 2), 0.0, 100.0))
