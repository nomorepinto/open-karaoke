from typing import Tuple
import numpy as np
import librosa


def normalize_audio_signal(
    y: np.ndarray,
    target_sr: int = 22050,
    orig_sr: int = 22050
) -> Tuple[np.ndarray, int]:
    """
    Ensures input audio signal array is 1D monophonic float32 and resampled to target sample rate.

    Args:
        y: Audio numpy array (1D mono or 2D stereo).
        target_sr: Target sample rate in Hz (default 22050).
        orig_sr: Original sample rate in Hz.

    Returns:
        (y_mono_resampled, target_sr)
    """
    if y is None or len(y) == 0:
        return np.array([], dtype=np.float32), target_sr

    # Ensure float32 range [-1.0, 1.0]
    y_float = y.astype(np.float32)

    # Convert stereo (2D) to mono (1D)
    if y_float.ndim > 1:
        y_float = np.mean(y_float, axis=0)

    # Resample if sample rate differs
    if orig_sr != target_sr:
        y_float = librosa.resample(y_float, orig_sr=orig_sr, target_sr=target_sr)

    # Peak normalize
    max_val = np.max(np.abs(y_float))
    if max_val > 1e-6:
        y_float = y_float / max_val

    return y_float, target_sr
