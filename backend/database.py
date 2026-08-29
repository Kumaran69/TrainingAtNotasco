"""
database.py — PostgreSQL connection setup via SQLAlchemy.

Reads the connection string from the DATABASE_URL environment variable
(set this in a .env file locally, or as an env var on your host in
production — see .env.example and the deployment guide in README.md).

Expected format:
    postgresql+psycopg2://<user>:<password>@<host>:<port>/<database>
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()  # reads a local .env file if present; no-op in production hosts
               # that inject env vars directly (Render, Railway, etc.)

DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Copy .env.example to .env and fill in "
        "your PostgreSQL connection string, or set DATABASE_URL as an "
        "environment variable on your deployment host."
    )

# pool_pre_ping avoids errors from stale connections after the DB
# (or a serverless provider like Neon) closes an idle connection.
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency: yields a DB session, closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
