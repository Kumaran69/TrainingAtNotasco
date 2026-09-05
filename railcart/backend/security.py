"""
Security primitives: API keys (app-level auth) + user accounts (JWT,
password hashing).

Design choices, and why:
  - API keys authenticate the CALLING APPLICATION (e.g. "this is the
    real RailCart frontend, not a random script").
  - JWT tokens authenticate the INDIVIDUAL USER within that application
    (e.g. "this request is acting on behalf of alice@example.com").
    Real production systems commonly use both layers together.
  - Passwords are hashed with PBKDF2-HMAC-SHA256 (100k iterations) using
    only Python's standard library (`hashlib`) -- no bcrypt/argon2
    dependency needed, which avoids native-extension build headaches
    on Windows while still being a well-vetted, slow, salted KDF.
  - JWTs are signed (HS256) with a server-side secret so their contents
    can't be forged; they are NOT encrypted, so nothing sensitive should
    be put in the payload (a user id is fine).
"""
import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from collections import defaultdict, deque

RAILCART_KEY_PREFIX = "rc_live_"
PBKDF2_ITERATIONS = 100_000


def generate_api_key() -> str:
    """A prefixed, URL-safe random key, e.g. rc_live_Xy3f...  """
    return f"{RAILCART_KEY_PREFIX}{secrets.token_urlsafe(32)}"


def hash_key(raw_key: str) -> str:
    """One-way hash for storage/lookup. Never store or log the raw key."""
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


class RateLimiter:
    """Fixed-window-ish rate limiter: N requests per rolling 60s window,
    tracked per identifier (here, per hashed API key or per client IP)."""

    def __init__(self, limit_per_minute: int):
        self.limit = limit_per_minute
        self._hits: dict[str, deque] = defaultdict(deque)

    def allow(self, identifier: str) -> bool:
        now = time.monotonic()
        window_start = now - 60
        hits = self._hits[identifier]

        while hits and hits[0] < window_start:
            hits.popleft()

        if len(hits) >= self.limit:
            return False

        hits.append(now)
        return True


# ---------------------------------------------------------
# Password hashing
# ---------------------------------------------------------
def hash_password(password: str) -> str:
    """Returns 'salt_hex$hash_hex'. Store this whole string."""
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, digest_hex = stored.split("$")
    except ValueError:
        return False
    salt = bytes.fromhex(salt_hex)
    expected = bytes.fromhex(digest_hex)
    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return hmac.compare_digest(actual, expected)


# ---------------------------------------------------------
# JWT (hand-rolled HS256 -- no external dependency, transparent about
# exactly what's happening: header.payload.signature, base64url-encoded)
# ---------------------------------------------------------
def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(s: str) -> bytes:
    padding = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + padding)


def create_access_token(user_id: str, secret: str, expire_minutes: int) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {"sub": user_id, "exp": int(time.time()) + expire_minutes * 60}

    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode())
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    signing_input = f"{header_b64}.{payload_b64}".encode()

    signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    signature_b64 = _b64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{signature_b64}"


def decode_access_token(token: str, secret: str) -> dict | None:
    """Returns the payload dict if the token is valid and unexpired, else None."""
    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
    except ValueError:
        return None

    signing_input = f"{header_b64}.{payload_b64}".encode()
    expected_sig = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    actual_sig = _b64url_decode(signature_b64)

    if not hmac.compare_digest(expected_sig, actual_sig):
        return None

    try:
        payload = json.loads(_b64url_decode(payload_b64))
    except (ValueError, json.JSONDecodeError):
        return None

    if payload.get("exp", 0) < time.time():
        return None

    return payload

