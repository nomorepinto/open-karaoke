"""
Repository layer providing clean CRUD interface for KaraokeScore records in PostgreSQL RDS.
db/ is the ONLY layer that communicates directly with RDS/SQLAlchemy.
"""
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.models.db_models import KaraokeScore
from app.models.schemas import MetricScores, SegmentDetail
from app.core.logging import logger


def save_score_record(
    db: Session,
    customer_id: str,
    vocal_s3_key: str,
    song_id: str,
    scores: MetricScores,
    total_score: float,
    segment_details: Optional[List[SegmentDetail]] = None
) -> KaraokeScore:
    """
    Persists a completed scoring result to PostgreSQL RDS.

    Args:
        db: Active SQLAlchemy Session instance.
        customer_id: Performer ID.
        vocal_s3_key: S3 bucket key of vocal recording.
        song_id: Song ID.
        scores: MetricScores instance containing all 4 score metrics.
        total_score: Composite 0-100 score.
        segment_details: Optional list of segment detail models for UI visualization.

    Returns:
        Created KaraokeScore ORM record.
    """
    serialized_details = (
        [seg.model_dump() for seg in segment_details] if segment_details else None
    )

    db_record = KaraokeScore(
        customer_id=customer_id,
        vocal_s3_key=vocal_s3_key,
        song_id=song_id,
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
        logger.info(f"Persisted score record ID={db_record.id} for customer='{customer_id}'")
        return db_record
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to persist score record to RDS: {e}")
        raise RuntimeError(f"Database write failure: {str(e)}") from e


def get_score_record_by_id(db: Session, record_id: str) -> Optional[KaraokeScore]:
    """Retrieves a single score record by UUID."""
    return db.query(KaraokeScore).filter(KaraokeScore.id == record_id).first()


def get_customer_scores(db: Session, customer_id: str, limit: int = 20) -> List[KaraokeScore]:
    """Queries score history for a specific customer."""
    return (
        db.query(KaraokeScore)
        .filter(KaraokeScore.customer_id == customer_id)
        .order_by(KaraokeScore.created_at.desc())
        .limit(limit)
        .all()
    )
