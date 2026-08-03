"""One-time schema setup for my-dev-cluster (password auth)."""
import os
import sys

import psycopg2

HOST = os.getenv(
    "DB_HOST",
    "my-dev-cluster.cluster-c5gog2m2mroy.ap-southeast-1.rds.amazonaws.com",
)
PASSWORD = os.getenv("DB_PASSWORD", "ChangeMe123!")


def main() -> None:
    conn = psycopg2.connect(
        host=HOST,
        port=5432,
        dbname="postgres",
        user="postgres",
        password=PASSWORD,
        sslmode="require",
    )
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS songs (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS scores (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            song_id INT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
            s3_link TEXT NOT NULL
        )
        """
    )
    cur.execute("CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_scores_song_id ON scores(song_id)")

    # Columns required by the scoring service ORM (beyond base schema)
    for col, typedef in [
        ("pitch_stability_score", "DOUBLE PRECISION DEFAULT 0.0"),
        ("rhythm_accuracy_score", "DOUBLE PRECISION DEFAULT 0.0"),
        ("volume_consistency_score", "DOUBLE PRECISION DEFAULT 0.0"),
        ("sustain_consistency_score", "DOUBLE PRECISION DEFAULT 0.0"),
        ("total_score", "DOUBLE PRECISION DEFAULT 0.0"),
        ("segment_details", "JSONB"),
        ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
    ]:
        cur.execute(f"ALTER TABLE scores ADD COLUMN IF NOT EXISTS {col} {typedef}")

    cur.execute("INSERT INTO users (name) SELECT 'dev-user' WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 1)")
    cur.execute("INSERT INTO songs (title) SELECT 'dev-song' WHERE NOT EXISTS (SELECT 1 FROM songs WHERE id = 1)")

    cur.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")
    print("Tables:", [row[0] for row in cur.fetchall()])

    cur.execute(
        """
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'scores'
        ORDER BY ordinal_position
        """
    )
    print("scores columns:", cur.fetchall())

    cur.execute(
        """
        SELECT conname, pg_get_constraintdef(oid)
        FROM pg_constraint
        WHERE conrelid = 'scores'::regclass
        """
    )
    print("scores constraints:", cur.fetchall())

    cur.execute("SELECT indexname FROM pg_indexes WHERE tablename = 'scores'")
    print("scores indexes:", [row[0] for row in cur.fetchall()])

    cur.close()
    conn.close()
    print("Schema setup OK")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
