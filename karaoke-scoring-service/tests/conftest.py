"""
Pytest configuration and synthetic audio generator fixtures for unit testing.
Programmatically creates audio buffers so tests run fully self-contained in isolation.
"""
import pytest
import numpy as np
import soundfile as sf
import tempfile
import os


@pytest.fixture
def sr():
    """Standard sample rate fixture."""
    return 22050


@pytest.fixture
def synthetic_vocal_audio(sr):
    """
    Generates a 3-second synthetic vocal recording featuring 2 sustained notes (440Hz A4 and 523.25Hz C5)
    with realistic volume envelope.
    """
    duration = 3.0
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    
    # 0.0s - 1.2s: Note 1 (A4 = 440 Hz)
    note1 = np.sin(2 * np.pi * 440.0 * t) * (t < 1.2)
    # 1.4s - 2.8s: Note 2 (C5 = 523.25 Hz)
    note2 = np.sin(2 * np.pi * 523.25 * t) * ((t >= 1.4) & (t < 2.8))
    
    y_vocal = (note1 + note2).astype(np.float32)
    
    # Apply fade in/out envelopes
    window = np.hanning(len(y_vocal))
    y_vocal = y_vocal * (0.8 + 0.2 * window)
    return y_vocal


@pytest.fixture
def synthetic_instrumental_audio(sr):
    """
    Generates a 3-second synthetic instrumental backing track featuring percussive click beats at 120 BPM (0.5s intervals).
    """
    duration = 3.0
    num_samples = int(sr * duration)
    y_inst = np.zeros(num_samples, dtype=np.float32)
    
    # Beats every 0.5s (120 BPM)
    beat_interval = int(sr * 0.5)
    for sample_idx in range(0, num_samples, beat_interval):
        # Insert a short percussive click burst (5ms)
        click_len = int(sr * 0.005)
        if sample_idx + click_len < num_samples:
            y_inst[sample_idx:sample_idx + click_len] = np.random.uniform(-0.8, 0.8, click_len)
            
    return y_inst


@pytest.fixture
def temporary_wav_file(synthetic_vocal_audio, sr):
    """Creates a temporary WAV audio file on disk for testing file loading handlers."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        sf.write(tmp.name, synthetic_vocal_audio, sr)
        tmp_path = tmp.name

    yield tmp_path

    if os.path.exists(tmp_path):
        os.remove(tmp_path)
