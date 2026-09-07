import { useState, useCallback } from "react";
import Dashboard from "./components/Dashboard.jsx";
import Expenses from "./components/Expenses.jsx";
import QuizScores from "./components/QuizScores.jsx";
import Toast from "./components/Toast.jsx";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "expenses", label: "Expenses" },
  { id: "scores", label: "Quiz Scores" },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, type = "success") => {
    setToast({ message, type, key: Date.now() });
  }, []);

  return (
    <div className="app">
      <header className="hero">
        <div className="hero__brand">
          <span className="hero__mark" aria-hidden="true">&#128218;</span>
          <span className="hero__wordmark">ScholarLedger</span>
        </div>
        <h1 className="hero__headline">Track your spending. Track your scores.</h1>
        <p className="hero__sub">One dashboard for student life &mdash; money in, grades tracked.</p>

        <nav className="tabs" aria-label="Main sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? "tab--active" : ""}`}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="main">
        {tab === "dashboard" && <Dashboard notify={notify} />}
        {tab === "expenses" && <Expenses notify={notify} />}
        {tab === "scores" && <QuizScores notify={notify} />}
      </main>

      <footer className="footer">
        <p>ScholarLedger &mdash; a demo full-stack project (FastAPI + React).</p>
      </footer>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
