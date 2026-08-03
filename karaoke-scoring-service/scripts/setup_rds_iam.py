"""Grant IAM database authentication to postgres and ensure scores table exists."""
import boto3
import psycopg2

HOST = "database-1.cluster-c5gog2m2mroy.ap-southeast-1.rds.amazonaws.com"
PORT = 5432
USER = "postgres"
REGION = "ap-southeast-1"
DB = "postgres"

rds = boto3.client("rds", region_name=REGION)
token = rds.generate_db_auth_token(DBHostname=HOST, Port=PORT, DBUsername=USER, Region=REGION)

conn = psycopg2.connect(
    host=HOST,
    port=PORT,
    dbname=DB,
    user=USER,
    password=token,
    sslmode="require",
)
conn.autocommit = True
cur = conn.cursor()

cur.execute("SELECT 1 FROM pg_roles WHERE rolname = 'rds_iam'")
if cur.fetchone():
    cur.execute("GRANT rds_iam TO postgres")
    print("Granted rds_iam to postgres")
else:
    print("WARNING: rds_iam role not found")

cur.execute("""
CREATE TABLE IF NOT EXISTS scores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    song_id INTEGER NOT NULL,
    s3_link TEXT NOT NULL,
    pitch_stability_score DOUBLE PRECISION DEFAULT 0.0,
    rhythm_accuracy_score DOUBLE PRECISION DEFAULT 0.0,
    volume_consistency_score DOUBLE PRECISION DEFAULT 0.0,
    sustain_consistency_score DOUBLE PRECISION DEFAULT 0.0,
    total_score DOUBLE PRECISION DEFAULT 0.0,
    segment_details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
""")
print("Ensured scores table exists")

cur.close()
conn.close()
print("RDS IAM setup complete")
