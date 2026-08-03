"""
Unit tests for audio analysis modules (app/analysis/).
Ensures that all 4 score metrics return values strictly bounded in [0.0, 100.0]
and handles edge cases gracefully.
"""
import pytest
import numpy as np
from app.analysis.segmentation import detect_sustained_note_segments, SustainedNoteSegment
from app.analysis.beat_grid import extract_beat_grid, BeatGrid
from app.analysis.pitch import compute_pitch_stability_score
from app.analysis.rhythm import compute_rhythm_accuracy_score
from app.analysis.volume import compute_volume_consistency_score
from app.analysis.sustain import compute_sustain_consistency_score


def test_beat_grid_extraction(synthetic_instrumental_audio, sr):
    """Verifies beat grid extraction tempo and subdivision generation."""
    grid = extract_beat_grid(synthetic_instrumental_audio, sr=sr, start_bpm=120.0)
    assert grid is not None
    assert grid.tempo_bpm > 0
    assert len(grid.subdivision_times) > 0
    assert grid.total_duration > 0.0

    # Test beat offset calculation
    abs_offset, signed_offset = grid.get_nearest_beat_offset(0.5)
    assert abs_offset >= 0.0
    assert isinstance(grid.seconds_to_beats(1.0), float)


def test_sustained_note_segmentation(synthetic_vocal_audio, sr):
    """Verifies sustained note detection from synthetic vocal recording."""
    segments, f0_hz, voiced_flag, f0_midi = detect_sustained_note_segments(
        synthetic_vocal_audio, sr=sr, min_segment_duration=0.10
    )
    assert isinstance(segments, list)
    assert len(f0_hz) > 0
    assert len(voiced_flag) == len(f0_hz)

    for seg in segments:
        assert seg.duration > 0
        assert seg.mean_f0_hz >= 0
        assert seg.pitch_variance_cents >= 0


def test_pitch_stability_scoring(synthetic_vocal_audio, sr):
    """Verifies Pitch Stability analyzer output bounds [0, 100]."""
    segments, _, _, _ = detect_sustained_note_segments(
        synthetic_vocal_audio, sr=sr, min_segment_duration=0.10
    )
    score = compute_pitch_stability_score(segments)
    assert 0.0 <= score <= 100.0


def test_rhythm_accuracy_scoring(synthetic_vocal_audio, synthetic_instrumental_audio, sr):
    """Verifies Rhythm Accuracy analyzer output bounds [0, 100]."""
    grid = extract_beat_grid(synthetic_instrumental_audio, sr=sr)
    score = compute_rhythm_accuracy_score(synthetic_vocal_audio, sr=sr, beat_grid=grid)
    assert 0.0 <= score <= 100.0


def test_volume_consistency_scoring(synthetic_vocal_audio, sr):
    """Verifies Volume Consistency analyzer output bounds [0, 100]."""
    score = compute_volume_consistency_score(synthetic_vocal_audio, sr=sr)
    assert 0.0 <= score <= 100.0


def test_sustain_consistency_scoring(synthetic_vocal_audio, synthetic_instrumental_audio, sr):
    """Verifies Sustain Consistency analyzer output bounds [0, 100]."""
    grid = extract_beat_grid(synthetic_instrumental_audio, sr=sr)
    segments, _, _, _ = detect_sustained_note_segments(
        synthetic_vocal_audio, sr=sr, min_segment_duration=0.10
    )
    score = compute_sustain_consistency_score(segments, beat_grid=grid)
    assert 0.0 <= score <= 100.0


def test_empty_audio_resilience(sr):
    """Verifies that empty or silent audio signals return safe default scores without crashing."""
    empty_y = np.zeros(sr, dtype=np.float32)
    grid = extract_beat_grid(empty_y, sr=sr)
    segments, _, _, _ = detect_sustained_note_segments(empty_y, sr=sr)

    assert 0.0 <= compute_pitch_stability_score(segments) <= 100.0
    assert 0.0 <= compute_rhythm_accuracy_score(empty_y, sr=sr, beat_grid=grid) <= 100.0
    assert 0.0 <= compute_volume_consistency_score(empty_y, sr=sr) <= 100.0
    assert 0.0 <= compute_sustain_consistency_score(segments, beat_grid=grid) <= 100.0
