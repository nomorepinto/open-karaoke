"""
Repository layer providing clean CRUD interface for Score records in PostgreSQL RDS.
db/ is the ONLY layer that communicates directly with RDS/SQLAlchemy.
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.db_models import Score, User, Song
from app.models.schemas import MetricScores, SegmentDetail
from app.core.logging import logger


def get_or_create_user(db: Session, name: str) -> User:
    """Find an existing booth user by name (case-insensitive) or create one."""
    normalized = name.strip()
    if not normalized:
        raise ValueError("Performer name cannot be empty.")

    existing = (
        db.query(User)
        .filter(func.lower(User.name) == normalized.lower())
        .first()
    )
    if existing:
        return existing

    user = User(name=normalized)
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info(f"Created booth user id={user.id} name='{user.name}'")
    return user


def get_or_create_song(db: Session, title: str) -> Song:
    """Find an existing song by title (case-insensitive) or create one."""
    normalized = title.strip()
    if not normalized:
        raise ValueError("Song title cannot be empty.")

    existing = (
        db.query(Song)
        .filter(func.lower(Song.title) == normalized.lower())
        .first()
    )
    if existing:
        return existing

    song = Song(title=normalized)
    db.add(song)
    db.commit()
    db.refresh(song)
    logger.info(f"Created booth song id={song.id} title='{song.title}'")
    return song


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

