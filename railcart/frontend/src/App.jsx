import { useState, useCallback } from "react";
import { useTheme } from "./ThemeContext.jsx";
import { useAuth } from "./AuthContext.jsx";
import AuthPage from "./components/AuthPage.jsx";
import Shop from "./components/Shop.jsx";
import Booking from "./components/Booking.jsx";
import Tickets from "./components/Tickets.jsx";
import Orders from "./components/Orders.jsx";
import Settings from "./components/Settings.jsx";
import Toast from "./components/Toast.jsx";

const TABS = [
  { id: "book", label: "Book a train" },
  { id: "shop", label: "Shop essentials" },
  { id: "tickets", label: "My tickets" },
  { id: "orders", label: "Order history" },
  { id: "settings", label: "Settings" },
];

export default function App() {
  const [tab, setTab] = useState("book");
  const [toast, setToast] = useState(null);
  const [ticketsRefreshKey, setTicketsRefreshKey] = useState(0);
  const { theme, toggleTheme } = useTheme();
  const { user, loading, logout } = useAuth();

  const notify = useCallback((message, type = "success") => {
    setToast({ message, type, key: Date.now() });
  }, []);

  if (loading) {
    return <div className="app-loading">Loading RailCart\u2026</div>;
  }

  if (!user) {
    return (
      <div className="app">
        <AuthPage notify={notify} />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="hero">
        <div className="hero__brand-row">
          <div className="hero__brand">
            <span className="hero__mark" aria-hidden="true">&#9992;</span>
            <span className="hero__wordmark">RailCart</span>
          </div>
          <div className="hero__account">
            <span className="hero__username">Hi, {user.name.split(" ")[0]}</span>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? "\u2600" : "\u263D"}
            </button>
            <button className="btn btn--ghost btn--small" onClick={logout}>
              Log out
            </button>
          </div>
        </div>

        <h1 className="hero__headline">Book your seat. Stock your journey.</h1>
        <p className="hero__sub">
          One ticket counter, one snack cart, one checkout &mdash; for every trip.
        </p>

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
        {tab === "book" && (
          <Booking notify={notify} onBooked={() => setTicketsRefreshKey((k) => k + 1)} />
        )}
        {tab === "shop" && <Shop notify={notify} />}
        {tab === "tickets" && <Tickets notify={notify} refreshKey={ticketsRefreshKey} />}
        {tab === "orders" && <Orders notify={notify} />}
        {tab === "settings" && <Settings notify={notify} />}
      </main>

      <footer className="footer">
        <p>RailCart &mdash; a demo full-stack project (FastAPI + MongoDB + React).</p>
      </footer>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
