"""
Service Module: Audio Loader.

Fetches vocal recording and instrumental backing track audio files from AWS S3 using boto3.
audio_loader.py is the ONLY file in the codebase that knows about S3 / boto3 API details.

Includes local filesystem fallback capabilities when S3 environment credentials/buckets are absent.
"""
import io
import os
import subprocess
import tempfile
from typing import Tuple

import boto3
import numpy as np
import soundfile as sf
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import settings
from app.core.logging import logger
from app.utils.audio_utils import normalize_audio_signal

_FFMPEG_SUFFIXES = (".m4a", ".mp4", ".caf", ".3gp", ".aac", ".mp3", ".webm")


def _suffix_for_key(s3_key: str) -> str:
    lower_key = s3_key.lower()
    for suffix in _FFMPEG_SUFFIXES:
        if lower_key.endswith(suffix):
            return suffix
    if lower_key.endswith(".wav"):
        return ".wav"
    if lower_key.endswith(".flac"):
        return ".flac"
    if lower_key.endswith(".ogg"):
        return ".ogg"
    return ".m4a"


def _needs_ffmpeg_decode(s3_key: str) -> bool:
    lower_key = s3_key.lower()
    return lower_key.endswith(_FFMPEG_SUFFIXES)


def _ffmpeg_binary() -> str:
    """Resolve ffmpeg path inside the Lambda container."""
    for candidate in ("/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg", "ffmpeg"):
        if candidate != "ffmpeg" and os.path.exists(candidate):
            return candidate
    return "ffmpeg"


def _load_with_ffmpeg(audio_bytes: bytes, suffix: str, target_sr: int) -> Tuple[np.ndarray, int]:
    """Decode mobile/container audio via ffmpeg into mono PCM wav bytes for soundfile."""
    ffmpeg_bin = _ffmpeg_binary()
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        cmd = [
            ffmpeg_bin,
            "-nostdin",
            "-loglevel",
            "error",
            "-i",
            tmp_path,
            "-f",
            "wav",
            "-acodec",
            "pcm_s16le",
            "-ac",
            "1",
            "-ar",
            str(target_sr),
            "pipe:1",
        ]
        result = subprocess.run(cmd, capture_output=True, check=True)
        if not result.stdout:
            raise ValueError("ffmpeg produced empty audio output")

        with io.BytesIO(result.stdout) as bio:
            y, sr = sf.read(bio)
        return y, sr
    except subprocess.CalledProcessError as exc:
        stderr = exc.stderr.decode("utf-8", errors="replace").strip()
        raise ValueError(f"ffmpeg decode failed: {stderr or exc}") from exc
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


def _decode_audio_bytes(audio_bytes: bytes, s3_key: str, target_sr: int) -> Tuple[np.ndarray, int]:
    if not audio_bytes:
        raise ValueError("Audio payload is empty")

    if _needs_ffmpeg_decode(s3_key):
        return _load_with_ffmpeg(audio_bytes, _suffix_for_key(s3_key), target_sr)

    with io.BytesIO(audio_bytes) as bio:
        try:
            y, sr = sf.read(bio)
            return y, sr
        except Exception as exc:
            logger.warning(f"soundfile decode failed for '{s3_key}', falling back to ffmpeg: {exc}")
            return _load_with_ffmpeg(audio_bytes, _suffix_for_key(s3_key), target_sr)


def fetch_audio_from_s3(
    bucket_name: str,
    s3_key: str,
    target_sr: int = 22050
) -> Tuple[np.ndarray, int]:
    """
    Downloads an audio file from S3 bucket into memory using boto3, returning normalized numpy signal.

    Args:
        bucket_name: Name of AWS S3 bucket.
        s3_key: Path/key of the object inside S3 bucket.
        target_sr: Target sample rate in Hz.

    Returns:
        (y_audio_signal, sample_rate)

    Raises:
        FileNotFoundError: If S3 key is missing / 404 error.
        ValueError: If audio payload is corrupt or unparseable.
        RuntimeError: On AWS SDK / BotoCore connectivity failure.
    """
    logger.info(f"Fetching audio from S3 bucket='{bucket_name}', key='{s3_key}'")

    # Local fallback for local dev / testing if file exists directly on disk
    if os.path.exists(s3_key):
        try:
            with open(s3_key, "rb") as handle:
                audio_bytes = handle.read()
            y, sr = _decode_audio_bytes(audio_bytes, s3_key, target_sr)
            return normalize_audio_signal(y, target_sr=target_sr, orig_sr=sr)
        except Exception as e:
            logger.warning(f"Local file fallback read failed for '{s3_key}': {e}")

    try:
        s3_client = boto3.client('s3', region_name=settings.AWS_REGION)
        response = s3_client.get_object(Bucket=bucket_name, Key=s3_key)
        audio_bytes = response['Body'].read()
        logger.info(f"Downloaded {len(audio_bytes)} bytes from s3://{bucket_name}/{s3_key}")

        y, sr = _decode_audio_bytes(audio_bytes, s3_key, target_sr)
        return normalize_audio_signal(y, target_sr=target_sr, orig_sr=sr)

    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        if error_code in ('404', 'NoSuchKey'):
            logger.error(f"S3 Object not found: s3://{bucket_name}/{s3_key}")
            raise FileNotFoundError(f"Missing S3 key '{s3_key}' in bucket '{bucket_name}'") from e
        logger.error(f"AWS S3 ClientError: {e}")
        raise RuntimeError(f"S3 download failed for key '{s3_key}': {str(e)}") from e

    except (BotoCoreError, Exception) as e:
        if isinstance(e, (FileNotFoundError, RuntimeError)):
            raise
        logger.error(f"Corrupt or unreadable audio file for key '{s3_key}': {e}")
        raise ValueError(f"Malformed audio file at S3 key '{s3_key}': {str(e)}") from e


def load_vocal_track(
    vocal_s3_key: str,
    target_sr: int = 22050,
) -> Tuple[np.ndarray, int]:
    """Load vocal recording only (pitch + volume scoring does not need instrumental)."""
    y_vocal, sr = fetch_audio_from_s3(
        bucket_name=settings.S3_BUCKET_VOCALS,
        s3_key=vocal_s3_key,
        target_sr=target_sr,
    )
    return y_vocal, sr


def load_vocal_and_instrumental_tracks(
    vocal_s3_key: str,
    song_id: str,
    target_sr: int = 22050
) -> Tuple[np.ndarray, np.ndarray, int]:
    """
    Convenience method loading both vocal recording and corresponding instrumental track by key/song_id.

    Returns:
        (y_vocal, y_instrumental, sample_rate)
    """
    instrumental_s3_key = f"songs/{song_id}/instrumental.wav"

    y_vocal, sr_v = fetch_audio_from_s3(
        bucket_name=settings.S3_BUCKET_VOCALS,
        s3_key=vocal_s3_key,
        target_sr=target_sr
    )

    try:
        y_inst, _ = fetch_audio_from_s3(
            bucket_name=settings.S3_BUCKET_SONGS,
            s3_key=instrumental_s3_key,
            target_sr=target_sr
        )
    except FileNotFoundError:
        # Fallback search without folder prefix
        logger.warning(f"Instrumental track not found at default key '{instrumental_s3_key}'. Trying '{song_id}.wav'")
        y_inst, _ = fetch_audio_from_s3(
            bucket_name=settings.S3_BUCKET_SONGS,
            s3_key=f"{song_id}.wav",
            target_sr=target_sr
        )

    return y_vocal, y_inst, target_sr
