"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Field } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.forgotPassword(email.trim());
      setMessage("If that email exists, a reset link has been sent.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <AppHeader subtitle="Password recovery" />
      <section className="glass mx-auto max-w-md p-6">
        <h2 className="font-display text-3xl font-bold uppercase">Forgot password</h2>
        <p className="mt-2 text-sm text-muted">We will email a reset link if the account exists.</p>
        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
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
          {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
          {message ? <p className="text-sm text-lime-400" role="status">{message}</p> : null}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <Link href="/login" className="mt-4 inline-block text-sm text-muted underline">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
