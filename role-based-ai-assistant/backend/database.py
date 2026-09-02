"""
database.py — MongoDB connection setup.

Reads MONGODB_URL from the environment (.env file locally). Two modes:
1. A real connection string (local MongoDB, Docker, or MongoDB Atlas).
2. The special value "mongomock" — spins up an in-memory MongoDB-compatible
   store instead, so you can try the whole app instantly with zero setup.
   Data is lost when the server restarts in this mode — fine for a quick
   test drive, not for real use.
"""

import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.environ.get("MONGODB_URL")
DB_NAME = os.environ.get("MONGODB_DB", "rule_based_assistant")

if not MONGODB_URL:
    raise RuntimeError(
        "MONGODB_URL is not set. Copy .env.example to .env and fill in your "
        "MongoDB connection string (or set it to 'mongomock' for an instant "
        "in-memory test run with no setup)."
    )

if MONGODB_URL.strip().lower() == "mongomock":
    import mongomock # type: ignore
    client = mongomock.MongoClient()
else:
    from pymongo import MongoClient
    client = MongoClient(MONGODB_URL)

db = client[DB_NAME]

sessions_col = db["sessions"]
messages_col = db["messages"]
tasks_col = db["tasks"]
