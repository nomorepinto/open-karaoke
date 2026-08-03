"""
Volume Consistency Analyzer Module.

Conceptual Description:
-----------------------
Volume Consistency measures vocal dynamics stability and vocal projection control within active musical phrases.

Without ground truth volume curves, this metric evaluates SELF-REFERENTIAL DYNAMICS CONTROL:
1. Computes the RMS energy envelope of the vocal recording using librosa.feature.rms.
2. Identifies active vocal phrase boundaries (delineated by silence/breath troughs).
3. Detects non-musical, sudden mid-phrase energy drops (e.g., loss of breath support, accidental mic pulling, or cracking)
   that differ from smooth, natural end-of-phrase trailing off.
4. Returns a 0 - 100 quality score based on the inverse frequency and severity of mid-phrase volume drop-offs.

Smooth, well-supported vocal dynamics score high (~100); shaky or unstable dynamic drops lower the score.
"""
import numpy as np
import librosa
from typing import List, Tuple


def compute_volume_consistency_score(
    y_vocal: np.ndarray,
    sr: int,
    frame_length: int = 2048,
    hop_length: int = 512,
    silence_threshold_db: float = -40.0,
    max_drop_db_per_sec: float = 25.0
) -> float:
    """
    Computes overall Volume Consistency score (0 - 100 scale) based on mid-phrase RMS energy stability.

    Args:
        y_vocal: Vocal audio signal array.
        sr: Sample rate in Hz.
        frame_length: Window size for RMS computation.
        hop_length: Hop length for RMS computation.
        silence_threshold_db: Energy floor (in dB relative to peak) below which audio is considered silence.
        max_drop_db_per_sec: Dynamic drop threshold (dB/sec) above which a drop is flagged as non-musical instability.

    Returns:
        Volume consistency score between 0.0 and 100.0.
    """
    if len(y_vocal) < sr * 0.5:
        return 50.0

    # Compute RMS energy envelope
    rms = librosa.feature.rms(y=y_vocal, frame_length=frame_length, hop_length=hop_length)[0]
    if len(rms) < 5:
        return 50.0

    # Convert RMS to dB scale relative to peak RMS
    max_rms = np.max(rms)
    if max_rms <= 1e-7:
        return 50.0

    rms_db = 20.0 * np.log10(np.maximum(rms, 1e-7) / max_rms)
    dt = hop_length / float(sr)

    # Active vocal frames (above silence floor)
    active_mask = rms_db > silence_threshold_db
    active_indices = np.where(active_mask)[0]

    if len(active_indices) < 5:
        return 50.0

    # Locate continuous active phrase blocks
    splits = np.where(np.diff(active_indices) > 1)[0] + 1
    phrase_blocks = np.split(active_indices, splits)

    total_phrases = len(phrase_blocks)
    unstable_drops_count = 0
    total_active_seconds = len(active_indices) * dt

    for block in phrase_blocks:
        if len(block) < 4:
            continue

        block_db = rms_db[block]
        # Calculate frame-to-frame drop rates (dB per second)
        diffs_db = np.diff(block_db)
        drop_rates = -diffs_db / dt  # Positive value indicates volume drop

        # Flag sudden drops in middle 80% of phrase (ignoring natural end-of-phrase trailing off)
        mid_start = int(len(block) * 0.1)
        mid_end = int(len(block) * 0.85)

        if mid_end > mid_start:
            mid_drop_rates = drop_rates[mid_start:mid_end]
            severe_drops = np.where(mid_drop_rates > max_drop_db_per_sec)[0]
            unstable_drops_count += len(severe_drops)

    # Calculate drop density per 10 seconds of active singing
    drops_per_10s = (unstable_drops_count / max(total_active_seconds, 1.0)) * 10.0

    # Map drop frequency to 0-100 score (0 drops -> 100 score; 5 drops/10s -> ~36 score)
    score = 100.0 * np.exp(-0.2 * drops_per_10s)
    return float(np.clip(round(score, 2), 0.0, 100.0))
