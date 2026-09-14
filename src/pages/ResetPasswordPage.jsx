import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { Field } from "../components/ui";
import { api, ApiError } from "../lib/api";

function ResetPasswordForm() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.resetPassword(token.trim(), password);
      navigate("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass panel-lg max-md">
      <h2 className="font-display" style={{ fontSize: "1.85rem", margin: 0 }}>
        Reset password
      </h2>
      <p className="mt-2 muted" style={{ fontSize: "0.9rem" }}>
        Paste your reset token and choose a new password.
      </p>
      <form className="stack mt-6" onSubmit={onSubmit}>
        <Field id="token" label="Reset token">
          <input
            id="token"
            className="input"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </Field>
        <Field id="password" label="New password" hint="At least 8 characters.">
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error ? (
          <p className="text-danger" style={{ fontSize: "0.9rem" }} role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Update password"}
        </button>
      </form>
      <Link to="/login" className="link-muted mt-4" style={{ display: "inline-block", fontSize: "0.9rem" }}>
        Back to sign in
      </Link>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="page">
      <AppHeader subtitle="Choose a new password" />
      <ResetPasswordForm />
    </main>
  );
}
