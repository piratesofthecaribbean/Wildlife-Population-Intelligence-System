"""
session.py
----------
SQLAlchemy engine + session factory + Base declarative class.
Provides `get_db` dependency for FastAPI routes.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# Create the SQLAlchemy engine using the DATABASE_URL from settings
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,   # verifies connections before using them (avoids stale connection errors)
    echo=settings.DEBUG,  # log SQL statements when DEBUG=True
)

# Session factory - each request gets its own session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class that all ORM models inherit from
Base = declarative_base()


def get_db():
    """
    FastAPI dependency that yields a database session
    and guarantees it is closed after the request completes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
