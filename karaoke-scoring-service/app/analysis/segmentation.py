"""
Shared Analysis Module: Sustained-Note Segmentation.

Conceptual Overview:
Auto-detects sustained note regions from a vocal recording without relying on lyrics or score cues.
Extracts fundamental frequency (f0) contour and voicing flags using librosa.pyin, then segments
contiguous voiced audio into distinct note intervals where pitch remains stable within ~0.5 semitones
(50 cents) of the running local mean.

Zero external dependencies outside numpy and librosa.
"""
from dataclasses import dataclass, field
from typing import List, Tuple, Optional
import numpy as np
import librosa


@dataclass
class SustainedNoteSegment:
    """
    Represents an auto-detected sustained vocal note region.
    """
    segment_index: int
    start_frame: int
    end_frame: int
    start_time: float
    end_time: float
    duration: float
    f0_contour_hz: np.ndarray
    f0_contour_midi: np.ndarray
    mean_f0_hz: float
    mean_f0_midi: float
    pitch_variance_cents: float
    voiced_probs: np.ndarray


def extract_pitch_and_voicing(
    y: np.ndarray,
    sr: int,
    fmin: float = 65.0,     # ~C2
    fmax: float = 1046.0,   # ~C6
    hop_length: int = 512,
    frame_length: int = 2048,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Extracts f0 contour in Hz and MIDI pitch numbers along with voicing flags using librosa.pyin.

    Returns:
        f0_hz: Array of fundamental frequencies in Hz (NaN for unvoiced frames).
        voiced_flag: Boolean array (True for voiced frames).
        voiced_probs: Voicing probability array (0.0 to 1.0).
        f0_midi: Pitch converted to MIDI note numbers (NaN for unvoiced frames).
    """
    f0_hz, voiced_flag, voiced_probs = librosa.pyin(
        y,
        sr=sr,
        fmin=fmin,
        fmax=fmax,
        frame_length=frame_length,
        hop_length=hop_length,
        fill_na=np.nan
    )

    # Convert Hz to MIDI pitch (standard formula: 69 + 12 * log2(f0 / 440))
    f0_midi = np.full_like(f0_hz, np.nan)
    valid_mask = ~np.isnan(f0_hz) & (f0_hz > 0)
    if np.any(valid_mask):
        f0_midi[valid_mask] = librosa.hz_to_midi(f0_hz[valid_mask])

    return f0_hz, voiced_flag, voiced_probs, f0_midi


def detect_sustained_note_segments(
    y: np.ndarray,
    sr: int,
    fmin: float = 65.0,
    fmax: float = 1046.0,
    hop_length: int = 512,
    max_pitch_dev_semitones: float = 0.5,
    min_segment_duration: float = 0.15,  # Minimum 150ms to count as a sustained note
) -> Tuple[List[SustainedNoteSegment], np.ndarray, np.ndarray, np.ndarray]:
    """
    Auto-detects sustained-note regions across a vocal recording.

    Step 1: Extract pitch (f0) and voicing flags using pYIN.
    Step 2: Find contiguous sequences of voiced frames.
    Step 3: Sub-segment contiguous regions when local pitch deviates by more than
            max_pitch_dev_semitones (~0.5 semitones / 50 cents) from running mean.
    Step 4: Filter out brief vocal blips below min_segment_duration.

    Returns:
        List of SustainedNoteSegment instances, plus raw f0_hz, voiced_flag, f0_midi arrays.
    """
    f0_hz, voiced_flag, voiced_probs, f0_midi = extract_pitch_and_voicing(
        y, sr, fmin=fmin, fmax=fmax, hop_length=hop_length
    )

    segments: List[SustainedNoteSegment] = []
    num_frames = len(f0_hz)
    min_frames = int(np.ceil(min_segment_duration * sr / hop_length))

    if num_frames == 0 or not np.any(voiced_flag):
        return segments, f0_hz, voiced_flag, f0_midi

    # Identify contiguous voiced regions
    voiced_indices = np.where(voiced_flag)[0]
    if len(voiced_indices) == 0:
        return segments, f0_hz, voiced_flag, f0_midi

    # Split indices where non-consecutive
    splits = np.where(np.diff(voiced_indices) > 1)[0] + 1
    voiced_blocks = np.split(voiced_indices, splits)

    seg_count = 0
    for block in voiced_blocks:
        if len(block) < min_frames:
            continue

        # Sub-segment block based on pitch jumps
        sub_start = 0
        for i in range(1, len(block)):
            curr_sub = block[sub_start:i]
            curr_midi = f0_midi[curr_sub]
            valid_midi = curr_midi[~np.isnan(curr_midi)]

            if len(valid_midi) == 0:
                continue

            local_mean = np.mean(valid_midi)
            next_pitch = f0_midi[block[i]]

            # If next frame deviates by more than allowed semitones from local mean, split
            if not np.isnan(next_pitch) and abs(next_pitch - local_mean) > max_pitch_dev_semitones:
                if (i - sub_start) >= min_frames:
                    sub_frames = block[sub_start:i]
                    segment = _build_segment(
                        seg_idx=seg_count,
                        frame_indices=sub_frames,
                        f0_hz=f0_hz,
                        f0_midi=f0_midi,
                        voiced_probs=voiced_probs,
                        sr=sr,
                        hop_length=hop_length
                    )
                    segments.append(segment)
                    seg_count += 1
                sub_start = i

        # Remaining frames in block
        if (len(block) - sub_start) >= min_frames:
            sub_frames = block[sub_start:]
            segment = _build_segment(
                seg_idx=seg_count,
                frame_indices=sub_frames,
                f0_hz=f0_hz,
                f0_midi=f0_midi,
                voiced_probs=voiced_probs,
                sr=sr,
                hop_length=hop_length
            )
            segments.append(segment)
            seg_count += 1

    return segments, f0_hz, voiced_flag, f0_midi


def _build_segment(
    seg_idx: int,
    frame_indices: np.ndarray,
    f0_hz: np.ndarray,
    f0_midi: np.ndarray,
    voiced_probs: np.ndarray,
    sr: int,
    hop_length: int
) -> SustainedNoteSegment:
    """Helper constructor for SustainedNoteSegment dataclass."""
    start_frame = int(frame_indices[0])
    end_frame = int(frame_indices[-1])
    start_time = float(librosa.frames_to_time(start_frame, sr=sr, hop_length=hop_length))
    end_time = float(librosa.frames_to_time(end_frame + 1, sr=sr, hop_length=hop_length))
    duration = end_time - start_time

    seg_f0_hz = f0_hz[frame_indices]
    seg_f0_midi = f0_midi[frame_indices]
    seg_probs = voiced_probs[frame_indices]

    valid_midi = seg_f0_midi[~np.isnan(seg_f0_midi)]
    valid_hz = seg_f0_hz[~np.isnan(seg_f0_hz)]

    mean_hz = float(np.mean(valid_hz)) if len(valid_hz) > 0 else 0.0
    mean_midi = float(np.mean(valid_midi)) if len(valid_midi) > 0 else 0.0

    # Calculate pitch variance in cents (1 MIDI semitone = 100 cents)
    if len(valid_midi) > 1:
        variance_semitones = float(np.var(valid_midi))
        variance_cents = variance_semitones * 10000.0  # (std * 100)^2
    else:
        variance_cents = 0.0

    return SustainedNoteSegment(
        segment_index=seg_idx,
        start_frame=start_frame,
        end_frame=end_frame,
        start_time=start_time,
        end_time=end_time,
        duration=duration,
        f0_contour_hz=seg_f0_hz,
        f0_contour_midi=seg_f0_midi,
        mean_f0_hz=mean_hz,
        mean_f0_midi=mean_midi,
        pitch_variance_cents=variance_cents,
        voiced_probs=seg_probs
    )
