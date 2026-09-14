"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Field } from "@/components/ui";
import { useAuth } from "@/context/AuthProvider";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("coach@evalscout.org");
  const [password, setPassword] = useState("Coach123!");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) router.replace("/dashboard");
  }, [loading, isAuthenticated, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <AppHeader subtitle="Coach sign in" />
      <section className="glass mx-auto max-w-md p-6">
        <h2 className="font-display text-3xl font-bold uppercase">Welcome back</h2>
        <p className="mt-2 text-sm text-muted">Sign in to manage rosters and evaluations.</p>
        <form className="mt-6 grid gap-4" onSubmit={onSubmit} noValidate>
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
          <Field id="password" label="Password">
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/forgot-password" className="text-lime-400 underline">
            Forgot password
          </Link>
          <Link href="/register" className="text-muted underline">
            Create account
          </Link>
        </div>
      </section>
    </main>
  );
}
