import { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";

export default function QuizScores({ notify }) {
  const [scores, setScores] = useState([]);
  const [summary, setSummary] = useState(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [score, setScore] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);

  const refresh = useCallback(async () => {
    const [list, sum] = await Promise.all([api.getScores(), api.getScoreSummary()]);
    setScores(list);
    setSummary(sum);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleAdd(e) {
    e.preventDefault();
    const numericScore = parseFloat(score);
    if (!name.trim()) return notify("Enter a student name.", "error");
    if (!subject.trim()) return notify("Enter a subject.", "error");
    if (Number.isNaN(numericScore) || numericScore < 0) return notify("Enter a valid score.", "error");

    try {
      await api.addScore(name.trim(), subject.trim(), numericScore);
      notify(`Saved ${name.trim()} - ${subject.trim()}: ${numericScore}`, "success");
      setName("");
      setSubject("");
      setScore("");
      setSearching(false);
      await refresh();
    } catch (err) {
      notify(err.message, "error");
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setSearching(false);
      return refresh();
    }
    try {
      const results = await api.searchScores(searchTerm.trim());
      setScores(results);
      setSearching(true);
    } catch (err) {
      notify(err.message, "error");
    }
  }

  const subjects = summary ? Object.keys(summary.by_subject) : [];

  return (
    <div className="two-col">
      <section>
        <h3 className="section-title">Enter a quiz score</h3>
        <form className="card" onSubmit={handleAdd}>
          <label className="field">
            <span>Student name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Asha Rao" />
          </label>
          <label className="field">
            <span>Subject</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics" />
          </label>
          <label className="field">
            <span>Score</span>
            <input type="number" min="0" step="0.5" value={score} onChange={(e) => setScore(e.target.value)} placeholder="0-100" />
          </label>
          <button className="btn btn--primary btn--full" type="submit">Save score</button>
        </form>

        {summary && (
          <div className="card summary-card">
            <div className="summary-card__total">
              <span>Overall average</span>
              <strong>{summary.average.toFixed(1)}</strong>
            </div>
            {subjects.length > 0 && (
              <ul className="breakdown-list">
                {subjects.map((s) => (
                  <li key={s}>
                    <span>{s}</span>
                    <span>{summary.by_subject[s].toFixed(1)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section>
        <h3 className="section-title">{searching ? "Search results" : "All scores"}</h3>
        <form className="filter-row" onSubmit={handleSearch}>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student name\u2026"
          />
          <button className="btn btn--ghost btn--small" type="submit">Search</button>
          {searching && (
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => { setSearchTerm(""); setSearching(false); refresh(); }}
            >
              Clear
            </button>
          )}
        </form>

        {scores.length === 0 ? (
          <p className="muted">{searching ? "No matching students found." : "No scores recorded yet."}</p>
        ) : (
          <ul className="record-list">
            {scores.map((s) => (
              <li key={s.id} className="record-row">
                <span className="record-row__primary">{s.name}</span>
                <span className="record-row__meta">{s.subject}</span>
                <span className="record-row__amount">{s.score}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
