"""Generate minimal test WAV files and upload to S3 for cloud scoring tests."""
import io
import struct
import wave

import boto3
import numpy as np

BUCKET = "open-karaoke-recordings-bucket"
REGION = "ap-southeast-1"
SR = 22050
DURATION_SEC = 1.0


def make_wav_bytes(frequency: float, amplitude: float = 0.5) -> bytes:
    t = np.linspace(0, DURATION_SEC, int(SR * DURATION_SEC), endpoint=False)
    signal = (amplitude * np.sin(2 * np.pi * frequency * t)).astype(np.float32)

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        pcm = (signal * 32767).astype(np.int16)
        wf.writeframes(pcm.tobytes())
    return buffer.getvalue()


def main() -> None:
    s3 = boto3.client("s3", region_name=REGION)

    vocal_key = "recordings/vocal_user_1_song_1.wav"
    inst_key = "songs/1/instrumental.wav"

    s3.put_object(Bucket=BUCKET, Key=vocal_key, Body=make_wav_bytes(440.0), ContentType="audio/wav")
    s3.put_object(Bucket=BUCKET, Key=inst_key, Body=make_wav_bytes(220.0), ContentType="audio/wav")

    print(f"Uploaded s3://{BUCKET}/{vocal_key}")
    print(f"Uploaded s3://{BUCKET}/{inst_key}")


if __name__ == "__main__":
    main()
