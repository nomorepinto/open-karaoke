"""
Booth API routes: register performer, register song, get upload URL.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.logging import logger
from app.db.repository import get_or_create_song, get_or_create_user
from app.db.session import get_db
from app.models.schemas import (
    BoothSongRequest,
    BoothSongResponse,
    BoothUploadUrlRequest,
    BoothUploadUrlResponse,
    BoothUserRequest,
    BoothUserResponse,
)
from app.services.s3_upload import build_vocal_s3_key, create_presigned_upload_url

router = APIRouter(prefix="/booth", tags=["Booth"])


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
