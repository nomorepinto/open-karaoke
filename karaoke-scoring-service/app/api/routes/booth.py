"""
Booth API routes: register performer, register song, upload recording.
"""
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.db.repository import get_or_create_song, get_or_create_user
from app.db.session import get_db
from app.models.schemas import (
    BoothSongRequest,
    BoothSongResponse,
    BoothUploadResponse,
    BoothUploadUrlRequest,
    BoothUploadUrlResponse,
    BoothUserRequest,
    BoothUserResponse,
)
from app.services.s3_upload import (
    build_vocal_s3_key,
    create_presigned_upload_url,
    upload_vocal_recording,
)

router = APIRouter(prefix="/booth", tags=["Booth"])

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # API Gateway HTTP API payload limit


def _extension_from_filename(filename: str | None, content_type: str | None) -> str:
    if filename and "." in filename:
        return filename.rsplit(".", 1)[-1].lower()
    if content_type:
        mapping = {
            "audio/wav": "wav",
            "audio/x-wav": "wav",
            "audio/mp4": "m4a",
            "audio/m4a": "m4a",
            "audio/x-caf": "caf",
            "audio/3gpp": "3gp",
            "audio/3gp": "3gp",
        }
        return mapping.get(content_type.split(";")[0].strip(), "m4a")
    return "m4a"


@router.post(
    "/users",
    response_model=BoothUserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register or look up a booth performer by name",
)
def register_booth_user(request: BoothUserRequest, db: Session = Depends(get_db)):
    """Create a users row for the performer name, or return the existing one."""
    try:
        user = get_or_create_user(db, request.name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.error(f"Booth user registration failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register performer.",
        ) from exc

    return BoothUserResponse(user_id=user.id, name=user.name)


@router.post(
    "/songs",
    response_model=BoothSongResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register or look up a song by title",
)
def register_booth_song(request: BoothSongRequest, db: Session = Depends(get_db)):
    """Create a songs row for the performed track, or return the existing one."""
    try:
        song = get_or_create_song(db, request.title)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.error(f"Booth song registration failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register song.",
        ) from exc

    return BoothSongResponse(song_id=song.id, title=song.title)


@router.post(
    "/upload",
    response_model=BoothUploadResponse,
    summary="Upload a booth vocal recording through the API (recommended for mobile)",
)
async def upload_booth_recording(
    user_id: int = Form(..., gt=0),
    song_id: int = Form(..., gt=0),
    file: UploadFile = File(...),
):
    """
    Accepts multipart audio from the booth tablet and stores it in S3 via Lambda IAM.
    Avoids presigned URL signature issues on Android/iOS clients.
    """
    body = await file.read()
    if not body:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty audio upload.")
    if len(body) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Recording exceeds {MAX_UPLOAD_BYTES // (1024 * 1024)} MB upload limit.",
        )

    extension = _extension_from_filename(file.filename, file.content_type)
    s3_key = build_vocal_s3_key(user_id=user_id, song_id=song_id, file_extension=extension)
    content_type = (file.content_type or "application/octet-stream").split(";")[0].strip()

    try:
        upload_vocal_recording(s3_key=s3_key, body=body, content_type=content_type)
    except Exception as exc:
        logger.error(f"Booth vocal upload failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store vocal recording in S3.",
        ) from exc

    return BoothUploadResponse(
        s3_key=s3_key,
        bucket=settings.S3_BUCKET_VOCALS,
        bytes_uploaded=len(body),
    )


@router.post(
    "/upload-url",
    response_model=BoothUploadUrlResponse,
    summary="Get a presigned S3 URL to upload a vocal recording",
)
def get_booth_upload_url(request: BoothUploadUrlRequest):
    """Return a short-lived presigned PUT URL for the booth tablet to upload audio."""
    s3_key = build_vocal_s3_key(
        user_id=request.user_id,
        song_id=request.song_id,
        file_extension=request.file_extension,
    )
    upload_url, bucket = create_presigned_upload_url(
        s3_key=s3_key,
        content_type=request.content_type,
    )
    return BoothUploadUrlResponse(
        upload_url=upload_url,
        s3_key=s3_key,
        bucket=bucket,
    )
