"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Field } from "@/components/ui";
import { RequireAuth } from "@/components/RequireAuth";
import { setTheme } from "@/components/ThemeSync";
import { api, ApiError } from "@/lib/api";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsContent />
    </RequireAuth>
  );
}

function SettingsContent() {
  const [settings, setSettings] = useState<Settings>({
    theme: "dark",
    reportLanguage: "english",
    defaultRosterSize: 15,
    notificationsEnabled: true,
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .getSettings()
      .then((data) => {
        setSettings(data);
        if (data.theme) setTheme(data.theme);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load settings"));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const saved = await api.saveSettings(settings);
      setSettings(saved);
      if (saved.theme) setTheme(saved.theme);
      setMessage("Settings saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <AppHeader subtitle="App settings" />
      <section className="glass mb-5 p-6">
        <h2 className="font-display text-4xl font-bold uppercase">Settings</h2>
        <p className="mt-2 text-muted">Theme, report language, and roster defaults.</p>
      </section>
      <form className="glass grid max-w-xl gap-4 p-6" onSubmit={onSubmit}>
        <Field id="theme" label="Theme">
          <select
            id="theme"
            className="select"
            value={settings.theme ?? "dark"}
            onChange={(e) =>
              setSettings((s) => ({ ...s, theme: e.target.value as "dark" | "light" }))
            }
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </Field>
        <Field id="reportLanguage" label="Report language">
          <select
            id="reportLanguage"
            className="select"
            value={settings.reportLanguage ?? "english"}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                reportLanguage: e.target.value as Settings["reportLanguage"],
              }))
            }
          >
            <option value="english">English</option>
            <option value="spanish">Spanish</option>
            <option value="french">French</option>
            <option value="portuguese">Portuguese</option>
          </select>
        </Field>
        <Field id="defaultRosterSize" label="Default roster size">
          <input
            id="defaultRosterSize"
            className="input"
            type="number"
            min={1}
            max={100}
            value={settings.defaultRosterSize ?? 15}
            onChange={(e) =>
              setSettings((s) => ({ ...s, defaultRosterSize: Number(e.target.value) }))
            }
          />
        </Field>
        <label className="flex items-center gap-3 text-sm font-bold" htmlFor="notifications">
          <input
            id="notifications"
            type="checkbox"
            checked={Boolean(settings.notificationsEnabled)}
            onChange={(e) =>
              setSettings((s) => ({ ...s, notificationsEnabled: e.target.checked }))
            }
          />
          Enable notifications
        </label>
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
        {message ? <p className="text-sm text-lime-400" role="status">{message}</p> : null}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </button>
      </form>
    </main>
  );
}
