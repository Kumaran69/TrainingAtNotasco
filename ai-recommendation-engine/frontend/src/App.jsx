import React, { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "./api.js";

export default function App() {
  const [health, setHealth] = useState(null);
  const [courses, setCourses] = useState(null); // { all_courses, mandatory_beginner_courses }
  const [users, setUsers] = useState([]); // [{ user_id, interests }]
  const [selectedUser, setSelectedUser] = useState(null);
  const [profile, setProfile] = useState(null); // recommend_with_explanation payload
  const [compareTarget, setCompareTarget] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    const [u, c, h] = await Promise.all([api.users(), api.courses(), api.health()]);
    setUsers(u);
    setCourses(c);
    setHealth(h);
    return u;
  }, []);

  useEffect(() => {
    loadUsers()
      .then((u) => {
        if (u.length) setSelectedUser(u[0].user_id);
      })
      .catch((e) => setError(e.message));
  }, [loadUsers]);

  useEffect(() => {
    if (!selectedUser) return;
    setLoadingProfile(true);
    setError("");
    api
      .recommend(selectedUser)
      .then((data) => {
        setProfile(data);
        const others = data.similar_users;
        setCompareTarget(others.length ? others[0].user_id : "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingProfile(false));
  }, [selectedUser]);

  const refreshAfterMutation = async (newSelectedId) => {
    const u = await loadUsers();
    if (newSelectedId) setSelectedUser(newSelectedId);
    return u;
  };

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <h1>The Course Catalog</h1>
          <p className="status-line">
            <span className={`status-dot ${health?.storage === "mongodb" ? "" : "offline"}`} />
            {health
              ? health.storage === "mongodb"
                ? "Connected to MongoDB"
                : "Running on in-memory storage (MongoDB not detected)"
              : "Connecting…"}
          </p>
        </div>
        <span className="catalog-no">No. 001 — ML/AI Track</span>
      </header>

      {error && <div className="error-box">Something went wrong: {error}</div>}

      <div className="layout">
        <LearnerDrawer
          users={users}
          courses={courses}
          selectedUser={selectedUser}
          onSelect={setSelectedUser}
          onCreated={refreshAfterMutation}
        />

        <main>
          {!selectedUser && !error && (
            <p className="loading">Pick a learner from the drawer to see their record.</p>
          )}

          {selectedUser && loadingProfile && <p className="loading">Pulling their record…</p>}

          {selectedUser && !loadingProfile && profile && (
            <Profile
              profile={profile}
              users={users}
              compareTarget={compareTarget}
              setCompareTarget={setCompareTarget}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function LearnerDrawer({ users, courses, selectedUser, onSelect, onCreated }) {
  const [newId, setNewId] = useState("");
  const [selectedInterests, setSelectedInterests] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const allCourses = courses?.all_courses || [];

  const toggleInterest = (course) => {
    setSelectedInterests((prev) => {
      const next = new Set(prev);
      next.has(course) ? next.delete(course) : next.add(course);
      return next;
    });
  };

  const handleCreate = async () => {
    const id = newId.trim().toLowerCase().replace(/\s+/g, "_");
    if (!id) {
      setFormError("Give the learner an ID first.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      await api.createUser(id, Array.from(selectedInterests));
      setNewId("");
      setSelectedInterests(new Set());
      await onCreated(id);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <aside className="drawer">
      <h2>Learners on file</h2>
      <div className="learner-list">
        {users.map((u) => (
          <button
            key={u.user_id}
            className={`learner-row ${u.user_id === selectedUser ? "active" : ""}`}
            onClick={() => onSelect(u.user_id)}
          >
            <span>{u.user_id}</span>
            <span className="count">{u.interests.length} known</span>
          </button>
        ))}
      </div>

      <div className="new-learner">
        <h3>Add a new learner</h3>
        <input
          placeholder="learner id, e.g. user_4"
          value={newId}
          onChange={(e) => setNewId(e.target.value)}
        />
        <div className="chip-picker">
          {allCourses.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip-toggle ${selectedInterests.has(c) ? "selected" : ""}`}
              onClick={() => toggleInterest(c)}
            >
              {c.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        {formError && <p className="form-error">{formError}</p>}
        <button className="submit" onClick={handleCreate} disabled={submitting}>
          {submitting ? "Filing…" : "File new record"}
        </button>
      </div>
    </aside>
  );
}

function Profile({ profile, users, compareTarget, setCompareTarget }) {
  const { user_id, known_courses, recommendations, similar_users, mandatory_beginner_courses } =
    profile;

  const compareRow = useMemo(
    () => similar_users.find((s) => s.user_id === compareTarget),
    [similar_users, compareTarget]
  );

  const hasNoInterests = known_courses.length === 0;

  return (
    <>
      <div className="profile-head">
        <h2>{user_id}</h2>
      </div>
      <p className="profile-sub">
        {hasNoInterests
          ? "No interests on file yet — starting from the mandatory beginner track."
          : `${known_courses.length} course${known_courses.length === 1 ? "" : "s"} completed so far.`}
      </p>

      <p className="section-label">Known courses</p>
      <div className="tag-row">
        {hasNoInterests ? (
          <span className="tag muted">none yet</span>
        ) : (
          known_courses.map((c) => (
            <span className="tag" key={c}>
              {c.replace(/_/g, " ")}
            </span>
          ))
        )}
      </div>

      <p className="section-label">
        {hasNoInterests ? "Mandatory beginner courses" : "Recommended next"}
      </p>

      {recommendations.length === 0 ? (
        <div className="empty-note">
          No further recommendations — this learner already knows the full catalog.
        </div>
      ) : (
        <div className="rec-grid">
          {recommendations.map((course, i) => (
            <div className="rec-card" key={course}>
              <div className="rank">{String(i + 1).padStart(2, "0")}</div>
              <p className="course-name">{course.replace(/_/g, " ")}</p>
              <p className="why">
                {mandatory_beginner_courses.includes(course) && hasNoInterests
                  ? "Fixed beginner requirement"
                  : "Popular among similar learners"}
              </p>
            </div>
          ))}
        </div>
      )}

      {similar_users.length > 0 && (
        <div className="compare-block">
          <p className="section-label">Compare with another learner</p>
          <div className="compare-controls">
            <select value={compareTarget} onChange={(e) => setCompareTarget(e.target.value)}>
              {similar_users.map((s) => (
                <option key={s.user_id} value={s.user_id}>
                  {s.user_id}
                </option>
              ))}
            </select>
          </div>

          <table className="similar-table">
            <thead>
              <tr>
                <th>Learner</th>
                <th>Similarity</th>
                <th>Shared interests</th>
              </tr>
            </thead>
            <tbody>
              {similar_users.map((s) => (
                <tr key={s.user_id} style={{ opacity: s.user_id === compareTarget ? 1 : 0.55 }}>
                  <td>{s.user_id}</td>
                  <td>
                    <div className="sim-bar-track">
                      <div
                        className="sim-bar-fill"
                        style={{ width: `${Math.round(s.similarity * 100)}%` }}
                      />
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--ink-soft)" }}>
                      {(s.similarity * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td>
                    {s.shared_interests.length
                      ? s.shared_interests.map((c) => c.replace(/_/g, " ")).join(", ")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
