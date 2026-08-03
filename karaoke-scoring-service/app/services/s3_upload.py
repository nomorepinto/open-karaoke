"""S3 presigned upload URL generation for booth vocal recordings."""
from typing import Tuple

import boto3

from app.core.config import settings
from app.core.logging import logger


def build_vocal_s3_key(user_id: int, song_id: int, file_extension: str) -> str:
    """Build a unique S3 object key for a booth vocal recording."""
    import time

    ext = file_extension.lstrip(".").lower() or "m4a"
    timestamp = int(time.time() * 1000)
    return f"recordings/booth/user_{user_id}/song_{song_id}/{timestamp}.{ext}"


def create_presigned_upload_url(
    s3_key: str,
    content_type: str | None = None,
    expires_in: int = 900,
) -> Tuple[str, str]:
    """
    Generate a presigned PUT URL for uploading a vocal recording to S3.

    Content-Type is intentionally omitted from the signature so mobile clients
    are not rejected when the device sends a slightly different MIME header.

    Returns:
        (presigned_url, bucket_name)
    """
    bucket = settings.S3_BUCKET_VOCALS
    s3_client = boto3.client("s3", region_name=settings.AWS_REGION)

    params: dict = {
        "Bucket": bucket,
        "Key": s3_key,
    }

    presigned_url = s3_client.generate_presigned_url(
        ClientMethod="put_object",
        Params=params,
        ExpiresIn=expires_in,
    )

    logger.info(
        f"Generated presigned upload URL for s3://{bucket}/{s3_key} "
        f"(client content-type hint: {content_type or 'unspecified'})"
    )
    return presigned_url, bucket


def upload_vocal_recording(
    s3_key: str,
    body: bytes,
    content_type: str = "application/octet-stream",
) -> str:
    """Upload vocal bytes directly to S3 using Lambda IAM credentials."""
    bucket = settings.S3_BUCKET_VOCALS
    s3_client = boto3.client("s3", region_name=settings.AWS_REGION)
    s3_client.put_object(
        Bucket=bucket,
        Key=s3_key,
        Body=body,
        ContentType=content_type,
    )
    logger.info(f"Uploaded vocal recording to s3://{bucket}/{s3_key} ({len(body)} bytes)")
    return s3_key
