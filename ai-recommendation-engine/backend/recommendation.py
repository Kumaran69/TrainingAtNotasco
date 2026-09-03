"""
recommendation.py
------------------
Core recommendation engine logic.

Everything below works on plain Python `set` objects internally, because
set algebra (union, intersection, difference) maps directly onto the
concepts we need: "courses known", "courses unknown", "shared interests",
etc.

MANDATORY_BEGINNER_COURSES is a `frozenset` on purpose: it is a fixed,
never-mutated catalog of courses every brand-new user (with no interests
yet) should be pointed at. A frozenset communicates "this will never
change at runtime" and is hashable, so it can safely be used as a
dict key or stored as a constant without risk of accidental mutation.
"""

from __future__ import annotations
from typing import Dict, Iterable, List, Tuple


# ---------------------------------------------------------------------------
# Fixed / constant data
# ---------------------------------------------------------------------------

# A fixed set of mandatory beginner courses. frozenset -> immutable, hashable,
# safe to share as module-level state.
MANDATORY_BEGINNER_COURSES: frozenset = frozenset({"python", "data_science"})

ALL_COURSES: set = {
    "python",
    "machine_learning",
    "deep_learning",
    "nlp",
    "tensorflow",
    "pytorch",
    "computer_vision",
    "data_science",
}

# Seed users. In the Flask app these are loaded into / read from MongoDB,
# but the module works perfectly well standalone (e.g. for tests) using
# this in-memory default.
DEFAULT_USERS: Dict[str, set] = {
    "user_1": {"python", "machine_learning", "deep_learning", "nlp", "tensorflow"},
    "user_2": {"python", "machine_learning", "computer_vision", "pytorch"},
    "user_3": {"python", "deep_learning", "nlp", "computer_vision"},
}


# ---------------------------------------------------------------------------
# Basic set operations on a single user
# ---------------------------------------------------------------------------

def known_courses(user_interests: Iterable[str]) -> set:
    """Courses the user already knows."""
    return set(user_interests)


def unknown_courses(user_interests: Iterable[str], all_courses: Iterable[str] = ALL_COURSES) -> set:
    """Courses that exist in the catalog but the user hasn't taken yet."""
    return set(all_courses) - set(user_interests)


# ---------------------------------------------------------------------------
# Operations between two users
# ---------------------------------------------------------------------------

def common_interests(user_a_interests: Iterable[str], user_b_interests: Iterable[str]) -> set:
    """Shared interests between two users (set intersection)."""
    return set(user_a_interests) & set(user_b_interests)


def courses_from_other_user(
    target_interests: Iterable[str], other_interests: Iterable[str]
) -> set:
    """
    Courses another user knows that the target user does not.
    This is the raw pool a "people like you also took..." suggestion
    would be drawn from.
    """
    return set(other_interests) - set(target_interests)


def jaccard_similarity(user_a_interests: Iterable[str], user_b_interests: Iterable[str]) -> float:
    """
    Similarity between two users' interest sets, using the Jaccard index:

        similarity = |A intersect B| / |A union B|

    Returns a float in [0.0, 1.0]. Two users with no interests at all
    are defined as having 0 similarity (there's nothing to compare).
    """
    a, b = set(user_a_interests), set(user_b_interests)
    union = a | b
    if not union:
        return 0.0
    return len(a & b) / len(union)


# ---------------------------------------------------------------------------
# The recommender
# ---------------------------------------------------------------------------

def recommend_courses(
    user_id: str,
    users: Dict[str, Iterable[str]] | None = None,
    all_courses: Iterable[str] = ALL_COURSES,
    top_n: int = 3,
) -> List[str]:
    """
    Recommend up to `top_n` courses for `user_id`.

    Strategy (collaborative filtering, "users like you"):
      1. Look up the target user's known interests.
      2. If they have none, fall back to the mandatory beginner courses.
      3. Otherwise, compare the target user against every other user with
         Jaccard similarity. Each other user "votes" for the courses they
         know that the target user doesn't, weighted by how similar they
         are to the target user.
      4. Courses are ranked by total weighted votes (most-similar users'
         courses count for more), ties broken alphabetically for
         determinism.
      5. If that still doesn't produce `top_n` courses (e.g. a brand-new
         catalog, or everyone is dissimilar), the remaining unknown
         catalog courses are appended alphabetically to pad the list.
      6. Already-known courses are never recommended (guaranteed by using
         set difference throughout).

    `user_id` must exist in `users` (or the module default). Returns a
    list of course names, length <= top_n.
    """
    users = dict(users) if users is not None else DEFAULT_USERS
    if user_id not in users:
        raise KeyError(f"Unknown user_id: {user_id!r}")

    target_interests = known_courses(users[user_id])

    # Handle users with no interests: point them at the fixed beginner set.
    if not target_interests:
        beginner_pick = sorted(MANDATORY_BEGINNER_COURSES & set(all_courses))
        if not beginner_pick:
            beginner_pick = sorted(MANDATORY_BEGINNER_COURSES)
        return beginner_pick[:top_n]

    # Weighted votes: course -> accumulated similarity score.
    votes: Dict[str, float] = {}
    for other_id, other_interests in users.items():
        if other_id == user_id:
            continue
        other_interests = set(other_interests)
        if not other_interests:
            continue

        sim = jaccard_similarity(target_interests, other_interests)
        if sim <= 0:
            continue

        for course in courses_from_other_user(target_interests, other_interests):
            votes[course] = votes.get(course, 0.0) + sim

    # Rank by score (desc), then name (asc) for stable, predictable output.
    ranked = sorted(votes.items(), key=lambda item: (-item[1], item[0]))
    recommendations: List[str] = [course for course, _score in ranked]

    # Prevent already-known courses from ever appearing (defensive; the set
    # difference above already guarantees this, but we double-check).
    recommendations = [c for c in recommendations if c not in target_interests]

    # Pad with any remaining catalog courses if we don't have enough yet.
    if len(recommendations) < top_n:
        already_suggested = set(recommendations)
        remaining = sorted(
            (set(all_courses) - target_interests) - already_suggested
        )
        recommendations.extend(remaining)

    return recommendations[:top_n]


def recommend_with_explanation(
    user_id: str,
    users: Dict[str, Iterable[str]] | None = None,
    all_courses: Iterable[str] = ALL_COURSES,
    top_n: int = 3,
) -> dict:
    """
    Convenience wrapper used by the API layer: bundles the recommendation
    together with the supporting data (known/unknown courses, and per-user
    similarity + shared interests) so the frontend can explain *why*
    something was recommended.
    """
    users = dict(users) if users is not None else DEFAULT_USERS
    target_interests = known_courses(users[user_id])

    similarities: List[Tuple[str, float, List[str]]] = []
    for other_id, other_interests in users.items():
        if other_id == user_id:
            continue
        sim = jaccard_similarity(target_interests, other_interests)
        shared = sorted(common_interests(target_interests, other_interests))
        similarities.append((other_id, round(sim, 3), shared))

    similarities.sort(key=lambda item: (-item[1], item[0]))

    return {
        "user_id": user_id,
        "known_courses": sorted(target_interests),
        "unknown_courses": sorted(unknown_courses(target_interests, all_courses)),
        "recommendations": recommend_courses(user_id, users, all_courses, top_n),
        "similar_users": [
            {"user_id": uid, "similarity": sim, "shared_interests": shared}
            for uid, sim, shared in similarities
        ],
        "mandatory_beginner_courses": sorted(MANDATORY_BEGINNER_COURSES),
    }
