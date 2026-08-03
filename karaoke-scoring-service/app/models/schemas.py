"""
Pydantic schemas for request validation, API response structure, and metric breakdowns.
"""
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class ScoreRequest(BaseModel):
    """
    Request model for POST /score endpoint.
    Client provides customer identifier, key for recorded vocal audio in S3, and song ID.
    """
    customer_id: str = Field(
        ...,
        description="Unique identifier or username for the customer/performer.",
        json_schema_extra={"example": "user_alex_123"}
    )
    vocal_s3_key: str = Field(
        ...,
        description="S3 bucket key for the uploaded vocal audio recording.",
        json_schema_extra={"example": "recordings/vocal_user_alex_123_song_456.wav"}
    )
    song_id: str = Field(
        ...,
        description="Identifier of the performed song (used to locate instrumental track in S3).",
        json_schema_extra={"example": "song_456"}
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
    record_id: str = Field(..., description="Unique database UUID for the saved score record.")
    customer_id: str = Field(..., description="Customer/performer ID.")
    song_id: str = Field(..., description="Song identifier.")
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
