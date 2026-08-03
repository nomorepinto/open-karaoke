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
| **Pitch Stability** | Measures pitch steady-state control within sustained notes without unwanted vocal shaky wobble or intonation drift. | Uses `librosa.piptrack` to extract $f_0$ contour and voiced frames. Auto-segments contiguous voiced regions into sustained notes ($\le 0.5$ semitone variance). Score = inverse pitch variance in cents. |
| **Rhythm Accuracy** | Measures how tightly the singer's note attacks align with the instrumental beat grid and 8th-note subdivisions. | Isolates drum transients from instrumental via HPSS (`librosa.effects.hpss`) and tracks beats (`librosa.beat.beat_track`). Detects vocal onsets (`librosa.onset.onset_detect`). Score = offset closeness to beat grid. |
| **Volume Consistency** | Evaluates dynamics control and breath support within active singing phrases. | Computes RMS energy envelope (`librosa.feature.rms`). Detects phrase boundaries from silence troughs and flags sudden, non-musical mid-phrase volume drops. Score = inverse drop frequency/severity. |
| **Sustain Consistency** | Evaluates note duration regularity and musical plausibility relative to the song tempo. | Reuses sustained note segments and converts duration into musical beats using the instrumental's tempo. Evaluates quantization closeness to standard note lengths (quarter, half, whole). |

---

## 🏗️ Architecture & Data Flow

```
[Client App] ---> Uploads Vocal Audio ---> [S3 Recordings Bucket]
     |
     +---> POST /score { user_id, s3_link, song_id }
                 |
                 v
       [API Gateway + Lambda]
                 |
        +--------+--------+
        | Mangum FastAPI  |
        +--------+--------+
                 |
       +---------+---------+
       | audio_loader.py   | <---> S3 Recordings Bucket
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
│   ├── models/db_models.py        # SQLAlchemy ORM model (scores)
│   ├── db/session.py              # DB engine & IAM auth token injection
│   ├── db/repository.py           # RDS insert & query functions
│   ├── services/audio_loader.py   # Fetches vocal + instrumental from S3
│   ├── services/scoring_service.py # Orchestrates shared extractors & 4 analyzers
│   └── analysis/                  # Pure DSP analyzers
├── scripts/
│   └── validate_deploy.py         # Pre-deploy SAM template validation
├── tests/
├── Dockerfile                     # ECR container image build for Lambda
├── requirements.txt
├── template.yaml                  # SAM: Lambda + API Gateway + S3 bucket
├── samconfig.toml                 # SAM deploy defaults
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

Open [http://localhost:8000/docs](http://localhost:8000/docs) in your browser.

For local development, set a password-based `DATABASE_URL` pointing at localhost. IAM auth is only used for remote RDS hosts.

---

## 🐳 AWS Deployment

Because `librosa`, `scipy`, `numpy`, and `soundfile` exceed the 250MB Lambda zip limit, this service deploys as a **Docker container image** via SAM.

### What SAM deploys

| Resource | Provisioned by SAM? |
| :--- | :--- |
| Lambda (container) | Yes |
| API Gateway HTTP API | Yes |
| S3 bucket (`open-karaoke-recordings-bucket`) | Yes (or reference existing bucket) |
| RDS Aurora PostgreSQL (IAG) | **No** — express-config cluster exists beforehand |

RDS is an **Aurora PostgreSQL express-configuration cluster** using the **Internet Access Gateway (IAG)**. It lives outside any customer VPC. Lambda reaches it over the public cluster endpoint with IAM auth and TLS — no VPC, subnets, or security groups are involved.

Provide the cluster connection string and IAM auth details as deploy parameters.

### Prerequisites

- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- [Docker](https://docs.aws.amazon.com/get-docker/)
- AWS credentials configured (`aws configure` or SSO)
- Aurora PostgreSQL express-config cluster with Internet Access Gateway
- IAM-only authentication enabled (password auth disabled on IAG clusters)
- RDS DB user granted the `rds_iam` role

### Pre-deploy validation

```bash
python scripts/validate_deploy.py
sam validate --lint
```

### Configure deploy parameters

Edit `samconfig.toml` and replace placeholders:

| Parameter | Description |
| :--- | :--- |
| `UseExistingS3Bucket` | Set to `true` if the bucket already exists in AWS |
| `ExistingS3BucketName` | Bucket name when using an existing bucket |
| `DatabaseUrl` | Cluster endpoint, no password (e.g. `postgresql://postgres@<cluster>.cluster-<id>.<region>.rds.amazonaws.com:5432/postgres`) |
| `RdsDbiResourceId` | RDS DBI resource ID from console (format `db-XXXXXXXX`) |
| `RdsDbUsername` | IAM-enabled DB user (default: `postgres`) |

**Important:** Do not set `AWS_REGION` in `template.yaml`. Lambda provides it automatically; overriding it blocks deployment.

**No VPC config needed.** IAG clusters are not in a customer VPC. Lambda connects directly over the internet using IAM tokens and TLS (`sslmode=require`).

### Deploy

```bash
sam build
sam deploy
```

### CI/CD (GitHub Actions)

Workflow: `.github/workflows/deploy-scoring-service.yml`

Required repository secrets:

| Secret | Description |
| :--- | :--- |
| `AWS_DEPLOY_ROLE_ARN` | IAM role ARN for OIDC deploy |
| `DATABASE_URL` | RDS connection string |
| `RDS_DBI_RESOURCE_ID` | RDS DBI resource ID for IAM auth |
| `RDS_DB_USERNAME` | Optional; defaults to `postgres` |
| `USE_EXISTING_S3_BUCKET` | Optional; set to `true` if bucket already exists |
| `EXISTING_S3_BUCKET_NAME` | Optional; defaults to `open-karaoke-recordings-bucket` |

### Post-deploy verification

```bash
# Health check
curl https://<api-id>.execute-api.ap-southeast-1.amazonaws.com/prod/health

# Confirm stack outputs
aws cloudformation describe-stacks --stack-name open-karaoke --query "Stacks[0].Outputs"
```

---

## 🔐 IAM & Network Requirements

1. **S3:** Lambda role gets `s3:GetObject` on the recordings bucket via `S3ReadPolicy`.
2. **RDS IAM auth:** Lambda role gets scoped `rds-db:connect` on `arn:aws:rds-db:{region}:{account}:dbuser:{DbiResourceId}/{username}`.
3. **IAG networking:** No VPC, subnet group, or security group configuration. Lambda reaches the Aurora cluster endpoint over the public internet. Connection uses TLS (`sslmode=require`) and a fresh IAM token per new connection (see `app/db/session.py`).

On cold start, FastAPI lifespan runs `init_db()` to create the `scores` table if it does not exist.
