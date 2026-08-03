"""
API Route Handler: POST /score.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.logging import logger
from app.db.repository import get_score_record_by_id, save_score_record
from app.db.session import get_db
from app.models.schemas import MetricScores, ScoreRequest, ScoreResponse
from app.services.audio_loader import load_vocal_track
from app.services.scoring_service import process_and_score_performance

router = APIRouter(prefix="/score", tags=["Scoring"])


@router.post(
    "",
    response_model=ScoreResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Score a karaoke vocal recording (pitch + volume)",
)
def score_performance(
    request: ScoreRequest,
    db: Session = Depends(get_db),
):
    """
    POST /score Endpoint.

    Orchestrates the scoring process:
    1. Downloads vocal recording from S3.
    2. Runs pitch stability and volume consistency analyzers.
    3. Persists performance scores and segment details to PostgreSQL RDS.
    4. Returns JSON response with composite total score and sub-scores.
    """
    logger.info(
        f"Received scoring request for user_id={request.user_id}, "
        f"s3_link='{request.s3_link}', song_id={request.song_id}"
    )

    try:
        y_vocal, sr = load_vocal_track(vocal_s3_key=request.s3_link)
    except FileNotFoundError as e:
        logger.error(f"S3 Resource Missing: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Requested audio resource not found in S3: {str(e)}",
        ) from e
    except ValueError as e:
        logger.error(f"Corrupt Audio File: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Uploaded vocal audio file is corrupt or unreadable: {str(e)}",
        ) from e
    except Exception as e:
        logger.error(f"Audio loading error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch audio from S3: {str(e)}",
        ) from e

    try:
        metric_scores, total_score, segment_details = process_and_score_performance(
            y_vocal=y_vocal,
            sr=sr,
        )
    except Exception as e:
        logger.error(f"Audio analysis failure: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Audio analysis pipeline failed: {str(e)}",
        ) from e

    try:
        db_record = save_score_record(
            db=db,
            user_id=request.user_id,
            song_id=request.song_id,
            s3_link=request.s3_link,
            scores=metric_scores,
            total_score=total_score,
            segment_details=segment_details,
        )
    except Exception as e:
        logger.error(f"Database write failure: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist performance score to database: {str(e)}",
        ) from e

    return ScoreResponse(
        record_id=db_record.id,
        user_id=db_record.user_id,
        song_id=db_record.song_id,
        s3_link=db_record.s3_link,
        total_score=db_record.total_score,
        scores=metric_scores,
        segment_details=segment_details,
        created_at=db_record.created_at,
    )


@router.get(
    "/{record_id}",
    response_model=ScoreResponse,
    summary="Retrieve a score record by integer ID",
)
def get_score_by_id(record_id: int, db: Session = Depends(get_db)):
    """Fetch previously persisted performance score from RDS by record ID."""
    record = get_score_record_by_id(db, record_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Score record with ID '{record_id}' not found.",
        )

    metric_scores = MetricScores(
        pitch_stability=record.pitch_stability_score or 0.0,
        rhythm_accuracy=record.rhythm_accuracy_score or 0.0,
        volume_consistency=record.volume_consistency_score or 0.0,
        sustain_consistency=record.sustain_consistency_score or 0.0,
    )

    return ScoreResponse(
        record_id=record.id,
        user_id=record.user_id,
        song_id=record.song_id,
        s3_link=record.s3_link,
        total_score=record.total_score or 0.0,
        scores=metric_scores,
        segment_details=record.segment_details,
        created_at=record.created_at,
    )
