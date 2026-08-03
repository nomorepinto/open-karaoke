"""
Pydantic schemas for request validation, API response structure, and metric breakdowns.
"""
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class ScoreRequest(BaseModel):
    """
    Request model for POST /score endpoint.
    Client provides user_id, song_id, and s3_link for recorded vocal audio in S3.
    """
    user_id: int = Field(
        ...,
        description="Foreign key ID for performer referencing users table.",
        json_schema_extra={"example": 1}
    )
    song_id: int = Field(
        ...,
        description="Foreign key ID for performed song referencing songs table.",
        json_schema_extra={"example": 456}
    )
    s3_link: str = Field(
        ...,
        description="S3 bucket key or URL for the uploaded vocal audio recording.",
        json_schema_extra={"example": "recordings/vocal_user_1_song_456.wav"}
    )


class SegmentDetail(BaseModel):
    """
    Detailed information for a single sustained note segment for frontend pitch visualization.
    """
    segment_index: int = Field(..., description="0-indexed sequence number of the note segment.")
    start_time: float = Field(..., description="Start timestamp of note segment in seconds.")
    end_time: float = Field(..., description="End timestamp of note segment in seconds.")
    duration: float = Field(..., description="Duration of note segment in seconds.")
    duration_beats: float = Field(..., description="Duration expressed in musical beats.")
    mean_pitch_hz: float = Field(..., description="Average fundamental frequency (Hz).")
    mean_pitch_midi: float = Field(..., description="Average pitch converted to MIDI note number.")
    pitch_variance_cents: float = Field(..., description="Pitch variation within segment in cents.")


class MetricScores(BaseModel):
    """
    Individual 0-100 quality scores for all 4 self-referential audio analyzers.
    """
    pitch_stability: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Pitch Stability Score (0-100). Measures pitch deviation within sustained note segments."
    )
    rhythm_accuracy: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Rhythm Accuracy Score (0-100). Measures timing offset of vocal attack onsets relative to instrumental beat grid."
    )
    volume_consistency: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Volume Consistency Score (0-100). Measures absence of sudden non-musical volume drops within vocal phrases."
    )
    sustain_consistency: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Sustain Consistency Score (0-100). Measures duration plausibility and regularity relative to tempo."
    )


class ScoreResponse(BaseModel):
    """
    API Response model returned after vocal analysis and DB persistence.
    """
    record_id: int = Field(..., description="Database serial ID for the saved score record.")
    user_id: int = Field(..., description="User ID.")
    song_id: int = Field(..., description="Song ID.")
    s3_link: str = Field(..., description="S3 vocal audio link/key.")
    total_score: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Overall composite karaoke score (0-100 scale)."
    )
    scores: MetricScores = Field(..., description="Individual breakdown for all 4 self-referential metrics.")
    segment_details: Optional[List[SegmentDetail]] = Field(
        default=None,
        description="Optional detailed array of sustained note segments for pitch curves / UI visualizers."
    )
    created_at: datetime = Field(..., description="Timestamp when score record was generated and persisted.")

