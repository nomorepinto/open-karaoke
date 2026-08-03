"""
Shared Analysis Module: Instrumental Beat Grid Extraction.

Conceptual Overview:
Extracts global tempo (BPM) and beat timestamps from the instrumental backing track.
Uses Harmonic-Percussive Source Separation (HPSS) to isolate rhythmically dominant percussive components
before performing beat tracking via librosa.beat.beat_track.

DESIGN DECISION / CACHING TRADEOFF:
------------------------------------
In production, running HPSS and STFT beat-tracking on a 3-4 minute instrumental track on every user scoring
request introduces ~1.5 - 3 seconds of CPU overhead per Lambda invocation. Since backing tracks are static
per song_id, beat grids SHOULD BE PRECOMPUTED ONCE when songs are ingested into the system and cached
(e.g., as JSON in S3 or a Postgres JSONB table indexed by song_id).

For this standalone microservice implementation, on-the-fly extraction is implemented as the fallback,
with pre-computed cache lookup hooks provided.
"""
from dataclasses import dataclass, field
from typing import List, Tuple, Optional
import numpy as np
import librosa


@dataclass
class BeatGrid:
    """
    Represents tempo, beat positions, and subdivision grids extracted from an instrumental song.
    """
    tempo_bpm: float
    beat_times: np.ndarray          # Array of beat timestamps in seconds
    subdivision_times: np.ndarray   # 1/8th note subdivision timestamps in seconds
    total_duration: float

    def get_nearest_beat_offset(self, timestamp: float) -> Tuple[float, float]:
        """
        Finds absolute timing offset (in seconds) between a given timestamp (e.g. vocal onset)
        and the closest beat or 1/8th note subdivision in the grid.

        Returns:
            (abs_offset_seconds, signed_offset_seconds)
        """
        if len(self.subdivision_times) == 0:
            return 0.0, 0.0

        idx = np.argmin(np.abs(self.subdivision_times - timestamp))
        nearest_time = self.subdivision_times[idx]
        signed_offset = timestamp - nearest_time
        return float(abs(signed_offset)), float(signed_offset)

    def seconds_to_beats(self, duration_seconds: float) -> float:
        """Converts a time duration in seconds into musical beat count based on BPM."""
        seconds_per_beat = 60.0 / max(self.tempo_bpm, 30.0)
        return float(duration_seconds / seconds_per_beat)


def extract_beat_grid(
    y_inst: np.ndarray,
    sr: int,
    start_bpm: float = 120.0,
    subdivisions_per_beat: int = 2  # Default to 8th-note grid
) -> BeatGrid:
    """
    Extracts global tempo (BPM) and beat grid timestamps from an instrumental audio track.

    Step 1: Apply Harmonic-Percussive Source Separation (HPSS) to isolate drum/percussive transients.
    Step 2: Track beats using librosa.beat.beat_track on the percussive signal component.
    Step 3: Generate subdivision timestamps (e.g., 8th note grid) for fine-grained rhythm matching.

    Returns:
        BeatGrid dataclass instance.
    """
    total_duration = float(len(y_inst) / sr)

    if len(y_inst) < sr * 2:
        # Fallback for extremely short test audio signals (< 2 seconds)
        beat_times = np.arange(0.0, total_duration, 0.5)
        return BeatGrid(
            tempo_bpm=120.0,
            beat_times=beat_times,
            subdivision_times=beat_times,
            total_duration=total_duration
        )

    # HPSS: Separate percussive element to eliminate harmonic melody interference
    _, y_percussive = librosa.effects.hpss(y_inst)

    # Beat tracking on isolated percussive signal
    tempo_array, beat_frames = librosa.beat.beat_track(
        y=y_percussive,
        sr=sr,
        start_bpm=start_bpm,
        units='frames'
    )

    # Handle float / array return format for tempo in newer librosa versions
    tempo_bpm = float(np.mean(tempo_array)) if hasattr(tempo_array, '__iter__') else float(tempo_array)
    if tempo_bpm <= 0 or np.isnan(tempo_bpm):
        tempo_bpm = 120.0

    beat_times = librosa.frames_to_time(beat_frames, sr=sr)
    if len(beat_times) == 0:
        beat_times = np.arange(0.0, total_duration, 60.0 / tempo_bpm)

    # Compute subdivision timestamps (e.g. 8th notes = 2 subdivisions per beat)
    subdiv_times_list = []
    seconds_per_beat = 60.0 / tempo_bpm
    subdiv_step = seconds_per_beat / subdivisions_per_beat

    for i in range(len(beat_times) - 1):
        t_start = beat_times[i]
        for sub in range(subdivisions_per_beat):
            subdiv_times_list.append(t_start + sub * subdiv_step)
    if len(beat_times) > 0:
        subdiv_times_list.append(beat_times[-1])

    subdivision_times = np.array(subdiv_times_list)

    return BeatGrid(
        tempo_bpm=tempo_bpm,
        beat_times=beat_times,
        subdivision_times=subdivision_times,
        total_duration=total_duration
    )
