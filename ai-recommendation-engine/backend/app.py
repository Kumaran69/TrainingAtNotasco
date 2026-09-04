"""
app.py
------
Flask REST API for the course recommendation engine.

Data lives in MongoDB (collection: users, db: course_recommender) when a
MongoDB server is reachable. If it isn't (e.g. no Mongo installed while
you're just trying the app locally), the app transparently falls back to
an in-memory store seeded with the same data, so `python app.py` always
works with zero setup. This is logged clearly on startup either way.
"""

import os
import logging
from dotenv import load_dotenv

# Load backend/.env (MONGO_URI, MONGO_DB_NAME, FRONTEND_ORIGIN, etc.) into
# os.environ BEFORE anything below reads them. Must run first, above every
# other os.environ.get() call in this file. No-op if .env doesn't exist,
# so this is safe in production too (Render/Railway inject real env vars
# directly and don't need a .env file at all).
load_dotenv()

from flask import Flask, jsonify, request
from flask_cors import CORS

from recommendation import (
    ALL_COURSES,
    DEFAULT_USERS,
    MANDATORY_BEGINNER_COURSES,
    recommend_with_explanation,
    jaccard_similarity,
    common_interests,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("recommender")

app = Flask(__name__)

# In dev, the Vite proxy makes CORS irrelevant. In production the frontend
# (Netlify) and backend (Render/Railway) live on different origins, so the
# allowed origin(s) must be configurable. Comma-separated list, or "*" to
# allow any origin (fine for a public read-mostly demo API).
_origins_env = os.environ.get("FRONTEND_ORIGIN", "*")
_allowed_origins = "*" if _origins_env == "*" else [o.strip() for o in _origins_env.split(",")]
CORS(app, resources={r"/api/*": {"origins": _allowed_origins}})

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.environ.get("MONGO_DB_NAME", "course_recommender")


# ---------------------------------------------------------------------------
# Storage layer: MongoDB if available, otherwise an in-memory dict with the
# exact same read/write surface, so the rest of the app never needs to care
# which one is active.
# ---------------------------------------------------------------------------

class InMemoryStore:
    """Fallback store with the same interface as the Mongo-backed one."""

    def __init__(self, seed_users):
        self._users = {uid: set(interests) for uid, interests in seed_users.items()}

    def all_users(self):
        return {uid: set(interests) for uid, interests in self._users.items()}

    def get_user(self, user_id):
        interests = self._users.get(user_id)
        return set(interests) if interests is not None else None

    def upsert_user(self, user_id, interests):
        self._users[user_id] = set(interests)

    def delete_user(self, user_id):
        return self._users.pop(user_id, None) is not None


class MongoStore:
    """Thin wrapper around a MongoDB `users` collection."""

    def __init__(self, uri, db_name):
        from pymongo import MongoClient

        self._client = MongoClient(uri, serverSelectionTimeoutMS=1500)
        self._client.admin.command("ping")  # fail fast if unreachable
        self._collection = self._client[db_name]["users"]

    def seed_if_empty(self, seed_users):
        if self._collection.count_documents({}) == 0:
            docs = [
                {"_id": uid, "interests": sorted(interests)}
                for uid, interests in seed_users.items()
            ]
            self._collection.insert_many(docs)
            log.info("Seeded MongoDB with %d default users.", len(docs))

    def all_users(self):
        return {
            doc["_id"]: set(doc["interests"]) for doc in self._collection.find()
        }

    def get_user(self, user_id):
        doc = self._collection.find_one({"_id": user_id})
        return set(doc["interests"]) if doc else None

    def upsert_user(self, user_id, interests):
        self._collection.update_one(
            {"_id": user_id},
            {"$set": {"interests": sorted(set(interests))}},
            upsert=True,
        )

    def delete_user(self, user_id):
        result = self._collection.delete_one({"_id": user_id})
        return result.deleted_count > 0


def build_store():
    try:
        store = MongoStore(MONGO_URI, DB_NAME)
        store.seed_if_empty(DEFAULT_USERS)
        log.info("Connected to MongoDB at %s (db=%s).", MONGO_URI, DB_NAME)
        return store
    except Exception as exc:  # noqa: BLE001 - any connection failure -> fallback
        log.warning(
            "MongoDB not reachable (%s). Falling back to in-memory storage. "
            "Data will reset when the server restarts.",
            exc,
        )
        return InMemoryStore(DEFAULT_USERS)


store = build_store()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "storage": "mongodb" if isinstance(store, MongoStore) else "in-memory",
    })


@app.get("/api/courses")
def list_courses():
    return jsonify({
        "all_courses": sorted(ALL_COURSES),
        "mandatory_beginner_courses": sorted(MANDATORY_BEGINNER_COURSES),
    })


@app.get("/api/users")
def list_users():
    users = store.all_users()
    return jsonify([
        {"user_id": uid, "interests": sorted(interests)}
        for uid, interests in sorted(users.items())
    ])


@app.post("/api/users")
def create_user():
    body = request.get_json(silent=True) or {}
    user_id = (body.get("user_id") or "").strip()
    interests = body.get("interests", [])

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    if store.get_user(user_id) is not None:
        return jsonify({"error": f"user '{user_id}' already exists"}), 409
    if not isinstance(interests, list):
        return jsonify({"error": "interests must be a list of strings"}), 400

    store.upsert_user(user_id, interests)
    return jsonify({"user_id": user_id, "interests": sorted(set(interests))}), 201


@app.delete("/api/users/<user_id>")
def delete_user(user_id):
    if user_id.startswith("user_") and user_id in DEFAULT_USERS:
        return jsonify({"error": "cannot delete a seeded demo user"}), 400
    deleted = store.delete_user(user_id)
    if not deleted:
        return jsonify({"error": f"user '{user_id}' not found"}), 404
    return jsonify({"deleted": user_id})


@app.get("/api/recommend/<user_id>")
def recommend(user_id):
    users = store.all_users()
    if user_id not in users:
        return jsonify({"error": f"user '{user_id}' not found"}), 404

    top_n = request.args.get("top_n", default=3, type=int)
    result = recommend_with_explanation(user_id, users, ALL_COURSES, top_n)
    return jsonify(result)


@app.get("/api/compare/<user_a>/<user_b>")
def compare(user_a, user_b):
    users = store.all_users()
    if user_a not in users:
        return jsonify({"error": f"user '{user_a}' not found"}), 404
    if user_b not in users:
        return jsonify({"error": f"user '{user_b}' not found"}), 404

    a_interests, b_interests = users[user_a], users[user_b]
    return jsonify({
        "user_a": user_a,
        "user_b": user_b,
        "similarity": round(jaccard_similarity(a_interests, b_interests), 3),
        "common_interests": sorted(common_interests(a_interests, b_interests)),
        "only_in_a": sorted(set(a_interests) - set(b_interests)),
        "only_in_b": sorted(set(b_interests) - set(a_interests)),
    })


if __name__ == "__main__":
    # Local/dev entry point only. In Docker/production, gunicorn runs
    # `app:app` directly instead (see Dockerfile / CMD), which is what
    # Render, Railway, etc. should use as the start command.
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "1") == "1"

    # The Werkzeug auto-reloader (which restarts the server on file
    # changes) has a known Windows-only bug where it throws
    # "OSError: [WinError 10038] An operation was attempted on something
    # that is not a socket" from a background thread on reload. It's
    # cosmetic/noisy rather than fatal, but disabling the reloader avoids
    # it entirely. Set FLASK_USE_RELOADER=1 to opt back in (e.g. on
    # macOS/Linux, where this bug doesn't occur) if you want auto-restart
    # on save.
    use_reloader = os.environ.get("FLASK_USE_RELOADER", "0") == "1"

    app.run(debug=debug, use_reloader=use_reloader, host="0.0.0.0", port=port)