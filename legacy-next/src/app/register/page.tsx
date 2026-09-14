"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Field } from "@/components/ui";
import { useAuth } from "@/context/AuthProvider";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  const { register, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [coachName, setCoachName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      await register(email.trim(), password, coachName.trim() || undefined);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to register");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <AppHeader subtitle="Create coach account" />
      <section className="glass mx-auto max-w-md p-6">
        <h2 className="font-display text-3xl font-bold uppercase">Join EvalScout</h2>
        <p className="mt-2 text-sm text-muted">Create an account to sync evaluations with the API.</p>
        <form className="mt-6 grid gap-4" onSubmit={onSubmit} noValidate>
          <Field id="coachName" label="Coach name">
            <input
              id="coachName"
              className="input"
              autoComplete="name"
              value={coachName}
              onChange={(e) => setCoachName(e.target.value)}
            />
          </Field>
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
          <Field id="password" label="Password" hint="At least 8 characters.">
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
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-lime-400 underline">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
