"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Field } from "@/components/ui";
import { RequireAuth } from "@/components/RequireAuth";
import { api, ApiError } from "@/lib/api";
import type { CoachProfile } from "@/lib/types";

const ROLES = ["Head Coach", "Assistant Coach", "Evaluator", "Director"];

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileContent />
    </RequireAuth>
  );
}

function ProfileContent() {
  const [profile, setProfile] = useState<CoachProfile>({
    coachName: "",
    coachEmail: "",
    phoneNumber: "",
    organizationName: "",
    teamName: "",
    teamIdentifier: "",
    sport: "",
    role: "Head Coach",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .getProfile()
      .then(setProfile)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load profile"));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const saved = await api.saveProfile(profile);
      setProfile(saved);
      setMessage("Profile saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function update<K extends keyof CoachProfile>(key: K, value: CoachProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="page">
      <AppHeader subtitle="Coach profile" />
      <section className="glass mb-5 p-6">
        <h2 className="font-display text-4xl font-bold uppercase">Coach profile</h2>
        <p className="mt-2 text-muted">Used on rankings and shareable evaluation reports.</p>
      </section>
      <form className="glass grid max-w-2xl gap-4 p-6" onSubmit={onSubmit}>
        <Field id="coachName" label="Coach name">
          <input
            id="coachName"
            className="input"
            value={profile.coachName ?? ""}
            onChange={(e) => update("coachName", e.target.value)}
          />
        </Field>
        <Field id="coachEmail" label="Email">
          <input
            id="coachEmail"
            className="input"
            type="email"
            value={profile.coachEmail ?? profile.email ?? ""}
            onChange={(e) => update("coachEmail", e.target.value)}
          />
        </Field>
        <Field id="phoneNumber" label="Phone">
          <input
            id="phoneNumber"
            className="input"
            value={profile.phoneNumber ?? ""}
            onChange={(e) => update("phoneNumber", e.target.value)}
          />
        </Field>
        <Field id="role" label="Role">
          <select
            id="role"
            className="select"
            value={profile.role ?? "Head Coach"}
            onChange={(e) => update("role", e.target.value)}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </Field>
        <Field id="organizationName" label="Organization">
          <input
            id="organizationName"
            className="input"
            value={profile.organizationName ?? ""}
            onChange={(e) => update("organizationName", e.target.value)}
          />
        </Field>
        <Field id="teamName" label="Team name">
          <input
            id="teamName"
            className="input"
            value={profile.teamName ?? ""}
            onChange={(e) => update("teamName", e.target.value)}
          />
        </Field>
        <Field id="teamIdentifier" label="Team identifier">
          <input
            id="teamIdentifier"
            className="input"
            value={profile.teamIdentifier ?? ""}
            onChange={(e) => update("teamIdentifier", e.target.value)}
          />
        </Field>
        <Field id="sport" label="Primary sport">
          <input
            id="sport"
            className="input"
            value={profile.sport ?? ""}
            onChange={(e) => update("sport", e.target.value)}
          />
        </Field>
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
        {message ? <p className="text-sm text-lime-400" role="status">{message}</p> : null}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </button>
      </form>
    </main>
  );
}
