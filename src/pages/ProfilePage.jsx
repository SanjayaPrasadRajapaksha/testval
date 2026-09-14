import { useEffect, useRef, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Field } from "../components/ui";
import { RequireAuth } from "../components/RequireAuth";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../lib/api";
import { createPreviewUrl, prepareImageForUpload, validateImageFile } from "../lib/imageUpload";
import { COACH_TITLES } from "../lib/roles";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\d\s.-]{7,30}$/;

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileContent />
    </RequireAuth>
  );
}

function ProfileContent() {
  const { user } = useAuth();
  const accountEmail = user?.email || "";
  const [profile, setProfile] = useState({
    coachName: "",
    coachEmail: "",
    phoneNumber: "",
    organizationName: "",
    teamName: "",
    teamIdentifier: "",
    sport: "",
    role: "Head Coach",
    logoUrl: null,
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api
      .getProfile()
      .then((loaded) => {
        setProfile({
          ...loaded,
          coachEmail: loaded.coachEmail || loaded.email || accountEmail,
        });
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load profile"));
  }, [accountEmail]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function update(key, value) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function onPickFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(file);
    setPreviewUrl(createPreviewUrl(file));
    setError("");
    setMessage("Preview ready. Upload to save your profile picture.");
  }

  async function uploadPending() {
    if (!pendingFile) return;
    setUploading(true);
    setUploadProgress(8);
    setError("");
    setMessage("");
    try {
      setUploadProgress(25);
      const prepared = await prepareImageForUpload(pendingFile);
      setUploadProgress(55);
      const uploaded = await api.uploadLogo(prepared, (pct) => {
        setUploadProgress(Math.max(55, Math.min(95, Math.round(pct))));
      });
      setUploadProgress(100);
      const next = { ...profile, logoUrl: uploaded.url };
      setProfile(next);
      setPendingFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setMessage("Profile picture uploaded.");
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function removeLogo() {
    setConfirmRemove(false);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const saved = await api.clearLogo();
      setProfile(saved);
      setPendingFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setMessage("Profile picture removed.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove profile picture.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const name = (profile.coachName || "").trim();
    const email = (profile.coachEmail || profile.email || "").trim();
    const phone = (profile.phoneNumber || "").trim();
    if (!name) {
      setError("Enter a coach name before saving.");
      setBusy(false);
      return;
    }
    if (email && !EMAIL_RE.test(email)) {
      setError("Enter a valid email address.");
      setBusy(false);
      return;
    }
    if (phone && !PHONE_RE.test(phone)) {
      setError("Enter a valid phone number.");
      setBusy(false);
      return;
    }
    try {
      const payload = {
        ...profile,
        coachName: name,
        coachEmail: email,
        phoneNumber: phone,
        organizationName: (profile.organizationName || "").trim(),
        teamName: (profile.teamName || "").trim(),
        teamIdentifier: (profile.teamIdentifier || "").trim(),
        sport: (profile.sport || "").trim(),
      };
      const saved = await api.saveProfile(payload);
      setProfile(saved);
      setMessage("Profile saved to your account.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save profile. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const displaySrc = previewUrl || profile.logoUrl || null;
  const initials = (profile.coachName || "C")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "C";

  return (
    <main className="page">
      <AppHeader subtitle="Coach profile" />
      <section className="glass panel-lg mb-5">
        <h2 className="font-display hero-title--md" style={{ margin: 0 }}>
          Coach profile
        </h2>
        <p className="mt-2 muted">Used on rankings and shareable evaluation reports.</p>
      </section>

      <section className="glass panel-lg stack max-2xl mb-5">
        <h3 style={{ margin: 0 }}>Profile picture</h3>
        <div className="avatar-row">
          {displaySrc ? (
            <img src={displaySrc} alt="Profile" className="avatar-preview" />
          ) : (
            <div className="avatar-fallback" aria-hidden>
              {initials}
            </div>
          )}
          <div className="stack" style={{ flex: 1, minWidth: 180 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={onPickFile}
            />
            <div className="row-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || busy}
              >
                {profile.logoUrl || previewUrl ? "Change picture" : "Choose picture"}
              </button>
              {pendingFile ? (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={uploadPending}
                  disabled={uploading || busy}
                >
                  {uploading ? `Uploading… ${uploadProgress}%` : "Upload"}
                </button>
              ) : null}
              {profile.logoUrl && !pendingFile ? (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => setConfirmRemove(true)}
                  disabled={uploading || busy}
                >
                  Remove
                </button>
              ) : null}
            </div>
            {uploading ? (
              <div className="upload-progress" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}>
                <div className="upload-progress__bar" style={{ width: `${uploadProgress}%` }} />
              </div>
            ) : null}
            <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>
              JPEG, PNG, WebP, or GIF. Max 5 MB. Large images are compressed before upload.
            </p>
          </div>
        </div>
      </section>

      <form className="glass panel-lg stack max-2xl" onSubmit={onSubmit}>
        <Field id="coachName" label="Coach name">
          <input
            id="coachName"
            className="input"
            value={profile.coachName ?? ""}
            onChange={(e) => update("coachName", e.target.value)}
          />
        </Field>
        <Field
          id="coachEmail"
          label="Email"
          hint={accountEmail ? `Pulled from your login (${accountEmail}). Used on evaluation PDFs.` : "Used on evaluation PDFs."}
        >
          <input
            id="coachEmail"
            className="input"
            type="email"
            value={profile.coachEmail ?? profile.email ?? accountEmail ?? ""}
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
        <Field id="role" label="Title (for reports)">
          <select
            id="role"
            className="select"
            value={profile.role ?? "Head Coach"}
            onChange={(e) => update("role", e.target.value)}
          >
            {COACH_TITLES.map((title) => (
              <option key={title} value={title}>
                {title}
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
        <button className="btn" type="submit" disabled={busy || uploading}>
          {busy ? "Saving…" : "Save profile"}
        </button>
      </form>

      <ConfirmDialog
        open={confirmRemove}
        title="Remove profile picture"
        message="Are you sure you want to remove your profile picture?"
        confirmLabel="Remove"
        danger
        busy={busy}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={removeLogo}
      />
    </main>
  );
}
