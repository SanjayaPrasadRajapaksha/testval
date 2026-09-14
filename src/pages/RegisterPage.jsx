import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { Field } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import { ACCOUNT_ROLES } from "../lib/roles";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [coachName, setCoachName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submittingRef = useRef(false);

  async function onSubmit(event) {
    event.preventDefault();

    // Prevent double submission
    if (submittingRef.current) return;

    setError("");

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = coachName.trim();

    // -----------------------------
    // Email validation
    // -----------------------------
    if (!trimmedEmail) {
      setError("Enter an email address.");
      return;
    }

    if (!EMAIL_RE.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    // -----------------------------
    // Password validation
    // -----------------------------
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError(
        "Password must include at least one letter and one number."
      );
      return;
    }

    // -----------------------------
    // Confirm password
    // -----------------------------
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    submittingRef.current = true;
    setBusy(true);

    try {
      // Always create account as USER
      await register(
        trimmedEmail,
        password,
        trimmedName || undefined,
        ACCOUNT_ROLES.USER
      );

      navigate("/verify-email", {
        replace: true,
        state: {
          email: trimmedEmail,
          verificationSent: true,
        },
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to create account. Try a different email."
      );
    } finally {
      setBusy(false);
      submittingRef.current = false;
    }
  }

  return (
    <main className="page">
      <AppHeader subtitle="Create coach account" />

      <section className="glass panel-lg max-md">
        <h2
          className="font-display"
          style={{
            fontSize: "1.85rem",
            margin: 0,
          }}
        >
          Join EvalScout
        </h2>

        <p
          className="mt-2 muted"
          style={{ fontSize: "0.9rem" }}
        >
          Create an account to sync evaluations with the API.
        </p>

        <form
          className="stack mt-6"
          onSubmit={onSubmit}
          noValidate
        >
          {/* Coach Name */}
          <Field id="coachName" label="Coach name">
            <input
              id="coachName"
              className="input"
              type="text"
              autoComplete="name"
              value={coachName}
              onChange={(e) => setCoachName(e.target.value)}
              disabled={busy}
            />
          </Field>

          {/* Email */}
          <Field id="email" label="Email">
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
          </Field>

          {/* Password */}
          <Field
            id="password"
            label="Password"
            hint="At least 8 characters, with a letter and a number."
          >
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
          </Field>

          {/* Confirm Password */}
          <Field
            id="confirmPassword"
            label="Confirm password"
          >
            <input
              id="confirmPassword"
              className="input"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              disabled={busy}
            />
          </Field>

          {/* Error */}
          {error ? (
            <p
              className="text-danger"
              style={{ fontSize: "0.9rem" }}
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {/* Submit */}
          <button
            className="btn"
            type="submit"
            disabled={busy}
          >
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>

        {/* Login link */}
        <p
          className="mt-4 muted"
          style={{ fontSize: "0.9rem" }}
        >
          Already have an account?{" "}
          <Link
            to="/login"
            className="link-lime"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}