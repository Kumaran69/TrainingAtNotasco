import { useState } from "react";
import { useAuth } from "../AuthContext.jsx";

export default function AuthPage({ notify }) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        await signup(name.trim(), email.trim(), password);
        notify("Account created. Welcome aboard!", "success");
      } else {
        await login(email.trim(), password);
        notify("Logged in.", "success");
      }
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-card__brand">
          <span className="hero__mark" aria-hidden="true">&#9992;</span>
          <span className="hero__wordmark">RailCart</span>
        </div>

        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            className={`auth-tab ${mode === "login" ? "auth-tab--active" : ""}`}
            onClick={() => setMode("login")}
          >
            Log in
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === "signup" ? "auth-tab--active" : ""}`}
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label className="field">
              <span>Full name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ananya Rao"
                required
                autoComplete="name"
              />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "At least 8 characters" : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
              required
              minLength={mode === "signup" ? 8 : undefined}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </label>

          <button className="btn btn--primary btn--full" type="submit" disabled={busy}>
            {busy ? "Please wait\u2026" : mode === "signup" ? "Create account" : "Log in"}
          </button>
        </form>

        <p className="auth-card__switch">
          {mode === "login" ? (
            <>New here? <button className="link-btn" onClick={() => setMode("signup")}>Create an account</button></>
          ) : (
            <>Already have an account? <button className="link-btn" onClick={() => setMode("login")}>Log in</button></>
          )}
        </p>
      </div>
    </div>
  );
}
