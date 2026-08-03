"""
API Route Handler: POST /score.

Architectural Design & Trigger Mechanism Tradeoff Comment:
-------------------------------------------------------
This endpoint uses an EXPLICIT API CALL (`POST /score` containing `{customer_id, vocal_s3_key, song_id}`).

TRADEOFF ANALYSIS (Explicit API Call vs S3 Event Notification):
1. EXPLICIT API CALL (Chosen approach):
   - Pros: Simple to test locally via OpenAPI UI / curl; allows client to attach rich payload metadata
     (customer_id, custom user tags); client receives immediate HTTP 200 response with score & segment JSON.
   - Cons: Requires an explicit HTTP request after the client completes S3 upload.

2. S3 EVENT NOTIFICATION TRIGGER (`s3:ObjectCreated:*` -> Lambda):
   - Pros: Fully asynchronous, decoupled client; scoring begins automatically as soon as S3 upload finishes.
   - Cons: Requires storing customer_id and song_id in S3 object metadata headers or separate DB session;
      harder to test locally; cannot return an immediate synchronous HTTP response payload to the web client.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.schemas import ScoreRequest, ScoreResponse, MetricScores
from app.db.session import get_db
from app.db.repository import save_score_record, get_score_record_by_id
from app.services.audio_loader import load_vocal_and_instrumental_tracks
from app.services.scoring_service import process_and_score_performance
from app.core.logging import logger

router = APIRouter(prefix="/score", tags=["Scoring"])


@router.post(
    "",
    response_model=ScoreResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Score a karaoke vocal recording against an instrumental song"
)
def score_performance(
    request: ScoreRequest,
    db: Session = Depends(get_db)
):
    """
    POST /score Endpoint.

    Orchestrates the scoring process:
    1. Downloads vocal recording and song instrumental track from S3 using boto3.
    2. Runs all 4 self-referential audio analyzers (Pitch, Rhythm, Volume, Sustain).
    3. Persists performance scores and segment details to PostgreSQL RDS.
    4. Returns JSON response containing composite total score, sub-scores, and segment visualization data.
    """
    logger.info(
        f"Received scoring request for customer='{request.customer_id}', "
        f"vocal_key='{request.vocal_s3_key}', song_id='{request.song_id}'"
    )

    # 1. Fetch audio files from S3
    try:
        y_vocal, y_inst, sr = load_vocal_and_instrumental_tracks(
            vocal_s3_key=request.vocal_s3_key,
            song_id=request.song_id
        )
    except FileNotFoundError as e:
        logger.error(f"S3 Resource Missing: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Requested audio resource not found in S3: {str(e)}"
        ) from e
    except ValueError as e:
        logger.error(f"Corrupt Audio File: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Uploaded vocal audio file is corrupt or unreadable: {str(e)}"
        ) from e
    except Exception as e:
        logger.error(f"Audio loading error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch audio from S3: {str(e)}"
        ) from e

    # 2. Execute scoring pipeline
    try:
        metric_scores, total_score, segment_details = process_and_score_performance(
            y_vocal=y_vocal,
            y_instrumental=y_inst,
            sr=sr
        )
    except Exception as e:
        logger.error(f"Audio analysis failure: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Audio analysis pipeline failed: {str(e)}"
        ) from e

    # 3. Persist score result to RDS PostgreSQL
    try:
        db_record = save_score_record(
            db=db,
            customer_id=request.customer_id,
            vocal_s3_key=request.vocal_s3_key,
            song_id=request.song_id,
            scores=metric_scores,
            total_score=total_score,
            segment_details=segment_details
        )
    except Exception as e:
        logger.error(f"Database write failure: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist performance score to database: {str(e)}"
        ) from e

    # 4. Construct response
    return ScoreResponse(
        record_id=db_record.id,
        customer_id=db_record.customer_id,
        song_id=db_record.song_id,
        total_score=db_record.total_score,
        scores=metric_scores,
        segment_details=segment_details,
        created_at=db_record.created_at
    )


@router.get(
    "/{record_id}",
    response_model=ScoreResponse,
    summary="Retrieve a score record by UUID"
)
def get_score_by_id(record_id: str, db: Session = Depends(get_db)):
    """Fetch previously persisted performance score from RDS by record UUID."""
    record = get_score_record_by_id(db, record_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Score record with ID '{record_id}' not found."
        )

    metric_scores = MetricScores(
        pitch_stability=record.pitch_stability_score,
        rhythm_accuracy=record.rhythm_accuracy_score,
        volume_consistency=record.volume_consistency_score,
        sustain_consistency=record.sustain_consistency_score
    )

    return ScoreResponse(
        record_id=record.id,
        customer_id=record.customer_id,
        song_id=record.song_id,
        total_score=record.total_score,
        scores=metric_scores,
        segment_details=record.segment_details,
        created_at=record.created_at
    )
