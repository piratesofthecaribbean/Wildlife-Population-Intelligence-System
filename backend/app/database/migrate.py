"""
Lightweight SQLite schema migration for development.
Adds new columns when the database was created before a previous milestone.
SQLAlchemy create_all() handles brand-new tables; this handles ALTER TABLE
additions for existing tables only.
"""

from sqlalchemy import inspect, text
from app.database import engine


MIGRATIONS = {
    "detections": [
        ("scientific_name", "VARCHAR"),
        ("animal_count", "INTEGER DEFAULT 1"),
        ("image_quality_json", "TEXT"),
        ("conservation_status", "VARCHAR"),
        ("is_endangered", "BOOLEAN DEFAULT 0"),
        ("taxonomy_json", "TEXT"),
        ("source_type", "VARCHAR DEFAULT 'image'"),
        ("model_used", "VARCHAR DEFAULT 'YOLO11'"),
        # Milestone 3: spatial / habitat observation fields (spec-required)
        ("latitude", "REAL"),
        ("longitude", "REAL"),
        ("habitat_type", "VARCHAR"),
        ("protected_area", "VARCHAR"),
    ],
    "species": [
        ("taxonomic_class", "VARCHAR"),
        ("taxonomic_order", "VARCHAR"),
        ("family", "VARCHAR"),
        ("diet", "VARCHAR"),
        ("habitat", "VARCHAR"),
    ],
}


def run_migrations():
    inspector = inspect(engine)
    with engine.connect() as conn:
        for table, columns in MIGRATIONS.items():
            if table not in inspector.get_table_names():
                continue
            existing = {col["name"] for col in inspector.get_columns(table)}
            for col_name, col_type in columns:
                if col_name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}"))
        conn.commit()
