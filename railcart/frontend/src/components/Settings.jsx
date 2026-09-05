import { useState } from "react";
import { api, getApiKey, setApiKey } from "../api.js";
import { useTheme } from "../ThemeContext.jsx";

export default function Settings({ notify }) {
  const [keyInput, setKeyInput] = useState(getApiKey());
  const [checking, setChecking] = useState(false);
  const { theme, toggleTheme } = useTheme();

  async function handleSave() {
    setApiKey(keyInput.trim());
    notify(keyInput.trim() ? "API key saved for this browser." : "API key cleared.", "success");
  }

  async function handleTestConnection() {
    setChecking(true);
    try {
      const health = await api.getHealth();
      notify(`Connected \u2014 API status: ${health.status}, database: ${health.database}`, "success");
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="settings">
      <section className="settings__card">
        <h3 className="section-title">API key</h3>
        <p className="muted">
          If the backend requires a key, paste it here. It's stored only in
          this browser and sent as the <code>X-API-Key</code> header on every
          request.
        </p>
        <label className="field">
          <span>Your API key</span>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="rc_live_..."
            autoComplete="off"
          />
        </label>
        <div className="settings__actions">
          <button className="btn btn--primary" onClick={handleSave}>Save key</button>
          <button className="btn btn--ghost" onClick={handleTestConnection} disabled={checking}>
            {checking ? "Checking\u2026" : "Test connection"}
          </button>
        </div>
      </section>

      <section className="settings__card">
        <h3 className="section-title">Appearance</h3>
        <p className="muted">Switch between light and dark mode. This is saved for next time.</p>
        <button className="btn btn--ghost" onClick={toggleTheme}>
          Switch to {theme === "dark" ? "light" : "dark"} mode
        </button>
      </section>
    </div>
  );
}
