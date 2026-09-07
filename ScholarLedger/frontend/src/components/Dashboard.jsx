import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Dashboard({ notify }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.getDashboard().then(setSummary).catch((err) => notify(err.message, "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!summary) return <p className="muted">Loading your dashboard\u2026</p>;

  return (
    <div className="dashboard">
      <div className="stat-grid">
        <div className="stat-card stat-card--ledger">
          <span className="stat-card__label">Total spent</span>
          <span className="stat-card__value">\u20B9{summary.expense_total.toFixed(2)}</span>
          <span className="stat-card__meta">{summary.expense_count} expense{summary.expense_count !== 1 ? "s" : ""} logged</span>
        </div>
        <div className="stat-card stat-card--score">
          <span className="stat-card__label">Quiz average</span>
          <span className="stat-card__value">{summary.quiz_average.toFixed(1)}</span>
          <span className="stat-card__meta">{summary.quiz_count} score{summary.quiz_count !== 1 ? "s" : ""} recorded</span>
        </div>
      </div>
      <p className="dashboard__hint muted">
        Use the tabs above to log a new expense or quiz score, or search through what you've already recorded.
      </p>
    </div>
  );
}
