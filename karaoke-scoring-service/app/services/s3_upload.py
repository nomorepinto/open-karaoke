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
    content_type: str,
    expires_in: int = 900,
) -> Tuple[str, str]:
    """
    Generate a presigned PUT URL for uploading a vocal recording to S3.

    Returns:
        (presigned_url, bucket_name)
    """
    bucket = settings.S3_BUCKET_VOCALS
    s3_client = boto3.client("s3", region_name=settings.AWS_REGION)

    presigned_url = s3_client.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": bucket,
            "Key": s3_key,
            "ContentType": content_type,
        },
        ExpiresIn=expires_in,
    )

    logger.info(f"Generated presigned upload URL for s3://{bucket}/{s3_key}")
    return presigned_url, bucket
