"""
SQLAlchemy ORM models for storing karaoke performance scores in PostgreSQL RDS.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, JSON
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class KaraokeScore(Base):
    """
    Database model representing a recorded karaoke performance scoring result in RDS.
    Stores customer identifier, S3 audio keys, song ID, all 4 metric scores, overall score,
    timestamp, and optional per-segment breakdown JSON for frontend UI rendering.
    """
    __tablename__ = "karaoke_scores"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id = Column(String(255), nullable=False, index=True)
    vocal_s3_key = Column(String(1024), nullable=False)
    song_id = Column(String(255), nullable=False, index=True)
    
    # All 4 metric scores (0 - 100 scale)
    pitch_stability_score = Column(Float, nullable=False)
    rhythm_accuracy_score = Column(Float, nullable=False)
    volume_consistency_score = Column(Float, nullable=False)
    sustain_consistency_score = Column(Float, nullable=False)
    
    # Overall aggregated composite score (0 - 100 scale)
    total_score = Column(Float, nullable=False)
    
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
            f"<KaraokeScore(id='{self.id}', customer_id='{self.customer_id}', "
            f"song_id='{self.song_id}', total_score={self.total_score:.1f})>"
        )
