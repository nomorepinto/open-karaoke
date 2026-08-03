# Karaoke Scoring Service 🎤⚡

A high-performance FastAPI backend for **self-referential karaoke vocal scoring** deployed on **AWS Lambda** (via Mangum) behind **API Gateway**. Persists score records to **AWS RDS (PostgreSQL)** and fetches audio recordings directly from **AWS S3**.

---

## 🌟 Context & Self-Referential Design

Unlike traditional singing evaluation tools that rely on pre-synchronized midi cued lyrics or ground-truth note sheets, this service scores a user's vocal recording using **ONLY**:
1. The user's vocal recording (audio file from S3)
2. The song's instrumental/backing track (audio file from S3)

All scoring is **self-referential** — derived strictly from signal processing analysis of the vocal performance relative to itself and the backing track's rhythmic pulse.

---

## 📊 The 4 Self-Referential Scoring Metrics

| Metric | Conceptual Definition | Implementation Details |
| :--- | :--- | :--- |
| **Pitch Stability** | Measures pitch steady-state control within sustained notes without unwanted vocal shaky wobble or intonation drift. | Uses `librosa.pyin` to extract $f_0$ contour and voiced flags. Auto-segments contiguous voiced regions into sustained notes ($\le 0.5$ semitone variance). Score = inverse pitch variance in cents. |
| **Rhythm Accuracy** | Measures how tightly the singer's note attacks align with the instrumental beat grid and 8th-note subdivisions. | Isolates drum transients from instrumental via HPSS (`librosa.effects.hpss`) and tracks beats (`librosa.beat.beat_track`). Detects vocal onsets (`librosa.onset.onset_detect`). Score = offset closeness to beat grid. |
| **Volume Consistency** | Evaluates dynamics control and breath support within active singing phrases. | Computes RMS energy envelope (`librosa.feature.rms`). Detects phrase boundaries from silence troughs and flags sudden, non-musical mid-phrase volume drops. Score = inverse drop frequency/severity. |
| **Sustain Consistency** | Evaluates note duration regularity and musical plausibility relative to the song tempo. | Reuses sustained note segments and converts duration into musical beats using the instrumental's tempo. Evaluates quantization closeness to standard note lengths (quarter, half, whole). |

---

## 🏗️ Architecture & Data Flow

```
[Client App] ---> Uploads Vocal Audio ---> [S3 Vocals Bucket]
     |
     +---> POST /score { customer_id, vocal_s3_key, song_id }
                 |
                 v
       [API Gateway + Lambda]
                 |
        +--------+--------+
        | Mangum FastAPI  |
        +--------+--------+
                 |
       +---------+---------+
       | audio_loader.py   | <---> S3 Vocals & Songs Buckets
       +---------+---------+
                 |
       +---------+---------+
       | scoring_service   | <---> app/analysis/ (Pure DSP)
       +---------+---------+
                 |
       +---------+---------+
       | db/repository.py  | ---> Persists Row to [AWS RDS PostgreSQL]
       +---------+---------+
```

---

## 📂 File Structure

```
karaoke-scoring-service/
├── app/
│   ├── main.py                    # FastAPI app + Mangum handler for Lambda
│   ├── api/routes/score.py        # POST /score endpoint — thin orchestration
│   ├── core/config.py             # Settings (S3 buckets, RDS URL, weights)
│   ├── core/logging.py            # Structured logging setup
│   ├── models/schemas.py          # Pydantic request/response models
│   ├── models/db_models.py        # SQLAlchemy ORM model (karaoke_scores)
│   ├── db/session.py              # DB engine & connection pooling setup
│   ├── db/repository.py           # RDS insert & query functions
│   ├── services/audio_loader.py   # Fetches vocal + instrumental from S3 (boto3)
│   ├── services/scoring_service.py # Orchestrates shared extractors & 4 analyzers
│   ├── analysis/
│   │   ├── segmentation.py        # Shared: sustained-note detection
│   │   ├── beat_grid.py           # Shared: instrumental beat grid extraction
│   │   ├── pitch.py               # Pitch stability analyzer
│   │   ├── rhythm.py              # Rhythm accuracy analyzer
│   │   ├── volume.py              # Volume consistency analyzer
│   │   └── sustain.py             # Sustain consistency analyzer
│   └── utils/audio_utils.py       # Audio resampling & mono normalization
├── tests/
│   ├── conftest.py                # Synthetic audio buffer generator fixtures
│   ├── test_analysis.py           # Unit tests for all 4 analyzers
│   └── test_api.py                # FastAPI TestClient endpoint integration tests
├── Dockerfile                     # ECR Container image build for Lambda
├── requirements.txt
├── template.yaml                  # AWS SAM template (Lambda + RDS + S3)
└── README.md
```

---

## 🚀 Local Setup & Testing

### 1. Create Virtual Environment & Install Dependencies
```bash
cd karaoke-scoring-service
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Run Automated Test Suite
```bash
python -m pytest tests/ -v
```

### 3. Launch Local Server
```bash
uvicorn app.main:app --reload --port 8000
```
Open [http://localhost:8000/docs](http://localhost:8000/docs) in your browser to inspect interactive Swagger documentation.

---

## 🐳 AWS Deployment (Container Image via ECR & SAM)

Because `librosa`, `scipy`, `numpy`, and `soundfile` exceed the 250MB AWS Lambda zip package limit, this service is deployed as a **Docker Container Image**.

```bash
# Build SAM Container Image
sam build

# Deploy to AWS Account
sam deploy --guided
```
