import { useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { Field } from "../components/ui";
import { api, ApiError } from "../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.forgotPassword(email.trim());
      setMessage(
        "If that email exists, a reset link has been sent. Check inbox and spam."
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <AppHeader subtitle="Password recovery" />
      <section className="glass panel-lg max-md">
        <h2 className="font-display" style={{ fontSize: "1.85rem", margin: 0 }}>
          Forgot password
        </h2>
        <p className="mt-2 muted" style={{ fontSize: "0.9rem" }}>
          We will email a reset link if the account exists. Check spam
          if you do not see it within a few minutes.
        </p>
        <form className="stack mt-6" onSubmit={onSubmit}>
          <Field id="email" label="Email">
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          {error ? (
            <p className="text-danger" style={{ fontSize: "0.9rem" }} role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="text-lime" style={{ fontSize: "0.9rem" }} role="status">
              {message}
            </p>
          ) : null}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <Link to="/login" className="link-muted mt-4" style={{ display: "inline-block", fontSize: "0.9rem" }}>
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
