"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Field } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.resetPassword(token.trim(), password);
      router.push("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass mx-auto max-w-md p-6">
      <h2 className="font-display text-3xl font-bold uppercase">Reset password</h2>
      <p className="mt-2 text-sm text-muted">Paste your reset token and choose a new password.</p>
      <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
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
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Update password"}
        </button>
      </form>
      <Link href="/login" className="mt-4 inline-block text-sm text-muted underline">
        Back to sign in
      </Link>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="page">
      <AppHeader subtitle="Choose a new password" />
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
