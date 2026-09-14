"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Field } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

function VerifyEmailForm() {
  const params = useSearchParams();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = params.get("token");
    if (t) setToken(t);
  }, [params]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.verifyEmail(token.trim());
      setMessage("Email verified. You can sign in.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass mx-auto max-w-md p-6">
      <h2 className="font-display text-3xl font-bold uppercase">Verify email</h2>
      <p className="mt-2 text-sm text-muted">Confirm your email with the token from your inbox.</p>
      <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
        <Field id="token" label="Verification token">
          <input
            id="token"
            className="input"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </Field>
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
        {message ? <p className="text-sm text-lime-400" role="status">{message}</p> : null}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Verifying…" : "Verify email"}
        </button>
      </form>
      <Link href="/login" className="mt-4 inline-block text-sm text-muted underline">
        Go to sign in
      </Link>
    </section>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="page">
      <AppHeader subtitle="Email verification" />
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <VerifyEmailForm />
      </Suspense>
    </main>
  );
}
