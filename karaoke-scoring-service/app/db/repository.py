"""
Repository layer providing clean CRUD interface for Score records in PostgreSQL RDS.
db/ is the ONLY layer that communicates directly with RDS/SQLAlchemy.
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.db_models import Score
from app.models.schemas import MetricScores, SegmentDetail
from app.core.logging import logger


def save_score_record(
    db: Session,
    user_id: int,
    song_id: int,
    s3_link: str,
    scores: MetricScores,
    total_score: float,
    segment_details: Optional[List[SegmentDetail]] = None
) -> Score:
    """
    Persists a completed scoring result to PostgreSQL RDS `scores` table.

    Args:
        db: Active SQLAlchemy Session instance.
        user_id: Foreign key ID for user.
        song_id: Foreign key ID for song.
        s3_link: S3 bucket key/link for vocal recording.
        scores: MetricScores instance containing all 4 score metrics.
        total_score: Composite 0-100 score.
        segment_details: Optional list of segment detail models for UI visualization.

    Returns:
        Created Score ORM record.
    """
    serialized_details = (
        [seg.model_dump() for seg in segment_details] if segment_details else None
    )

    db_record = Score(
        user_id=user_id,
        song_id=song_id,
        s3_link=s3_link,
        pitch_stability_score=scores.pitch_stability,
        rhythm_accuracy_score=scores.rhythm_accuracy,
        volume_consistency_score=scores.volume_consistency,
        sustain_consistency_score=scores.sustain_consistency,
        total_score=total_score,
        segment_details=serialized_details
    )

    try:
        db.add(db_record)
        db.commit()
        db.refresh(db_record)
        logger.info(f"Persisted score record ID={db_record.id} for user_id={user_id}")
        return db_record
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to persist score record to RDS: {e}")
        raise RuntimeError(f"Database write failure: {str(e)}") from e


def get_score_record_by_id(db: Session, record_id: int) -> Optional[Score]:
    """Retrieves a single score record by integer ID."""
    return db.query(Score).filter(Score.id == record_id).first()


def get_user_scores(db: Session, user_id: int, limit: int = 20) -> List[Score]:
    """Queries score history for a specific user."""
    return (
        db.query(Score)
        .filter(Score.user_id == user_id)
        .order_by(Score.created_at.desc())
        .limit(limit)
        .all()
    )

