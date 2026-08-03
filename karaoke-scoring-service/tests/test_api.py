"""
API Endpoint tests using FastAPI TestClient.
Tests GET /health and POST /score endpoints with mocked S3 audio loader and SQLite memory DB.
"""
import pytest
from unittest.mock import patch
import numpy as np
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.session import get_db
from app.models.db_models import Base

# Setup SQLite database for API testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_api.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_health_check():
    """Test GET /health endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


@patch("app.api.routes.score.load_vocal_and_instrumental_tracks")
def test_post_score_endpoint(mock_load_audio, synthetic_vocal_audio, synthetic_instrumental_audio, sr):
    """Test POST /score endpoint with mocked S3 audio downloader."""
    mock_load_audio.return_value = (synthetic_vocal_audio, synthetic_instrumental_audio, sr)

    payload = {
        "customer_id": "test_user_alex",
        "vocal_s3_key": "recordings/test_vocal.wav",
        "song_id": "dQw4w9WgXcQ"
    }

    response = client.post("/score", json=payload)
    assert response.status_code == 201, response.text

    data = response.json()
    assert "record_id" in data
    assert data["customer_id"] == "test_user_alex"
    assert data["song_id"] == "dQw4w9WgXcQ"
    assert 0.0 <= data["total_score"] <= 100.0
    assert "scores" in data
    assert 0.0 <= data["scores"]["pitch_stability"] <= 100.0
    assert 0.0 <= data["scores"]["rhythm_accuracy"] <= 100.0
    assert 0.0 <= data["scores"]["volume_consistency"] <= 100.0
    assert 0.0 <= data["scores"]["sustain_consistency"] <= 100.0

    # Retrieve record by ID
    rec_id = data["record_id"]
    get_res = client.get(f"/score/{rec_id}")
    assert get_res.status_code == 200
    assert get_res.json()["record_id"] == rec_id

    import os
    if os.path.exists("./test_api.db"):
        try:
            os.remove("./test_api.db")
        except Exception:
            pass
