"""
SQLAlchemy ORM models mapped to PostgreSQL RDS schema (`scores` table).
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Score(Base):
    """
    Database model representing a recorded karaoke performance scoring result in RDS.
    Mapped to existing `scores` table with user_id, song_id, s3_link, metrics, and timestamps.
    """
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    song_id = Column(Integer, nullable=False, index=True)
    s3_link = Column(Text, nullable=False)

    # Metric scores (0 - 100 scale)
    pitch_stability_score = Column(Float, nullable=True, default=0.0)
    rhythm_accuracy_score = Column(Float, nullable=True, default=0.0)
    volume_consistency_score = Column(Float, nullable=True, default=0.0)
    sustain_consistency_score = Column(Float, nullable=True, default=0.0)

    # Overall aggregated composite score (0 - 100 scale)
    total_score = Column(Float, nullable=True, default=0.0)

    # JSON column for per-segment detailed pitch/duration metadata
    segment_details = Column(JSON, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True
    )

    def __repr__(self):
        return (
            f"<Score(id={self.id}, user_id={self.user_id}, "
            f"song_id={self.song_id}, total_score={self.total_score})>"
        )

