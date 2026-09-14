import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { RequireAdmin } from "../components/RequireAdmin";
import { Field, Stat } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../lib/api";
import { ACCOUNT_ROLE_OPTIONS, ACCOUNT_ROLES, isAdminRole } from "../lib/roles";

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function AdminUserDetailPage() {
  return (
    <RequireAdmin>
      <UserDetail />
    </RequireAdmin>
  );
}

function UserDetail() {
  const { userId } = useParams();
  const { user: sessionUser, refreshUser } = useAuth();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingRole, setPendingRole] = useState(ACCOUNT_ROLES.USER);
  const [confirmRole, setConfirmRole] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await api.adminGetUser(userId);
        if (!cancelled) {
          setUser(data);
          setPendingRole(data.role || ACCOUNT_ROLES.USER);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load user");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function applyRoleChange() {
    setConfirmRole(false);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const updated = await api.adminUpdateAccountRole(userId, pendingRole);
      setUser((current) => ({ ...current, role: updated.role }));
      setMessage(`Account role set to ${updated.role}.`);
      if (sessionUser?.id === userId) {
        await refreshUser();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update account role.");
      setPendingRole(user?.role || ACCOUNT_ROLES.USER);
    } finally {
      setBusy(false);
    }
  }

  const roleDirty = user && pendingRole !== user.role;
  const demotingSelf =
    sessionUser?.id === userId && pendingRole !== ACCOUNT_ROLES.ADMIN && isAdminRole(user?.role);

  return (
    <main className="page">
      <AppHeader subtitle="User detail" />
      <p className="mb-4">
        <Link to="/admin" className="link-lime">
          ← Back to all users
        </Link>
      </p>

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? (
        <p className="text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-lime" role="status">
          {message}
        </p>
      ) : null}

      {user ? (
        <>
          <section className="glass panel-lg mb-5">
            <span className={`role-pill ${isAdminRole(user.role) ? "role-pill--admin" : ""}`}>
              {user.role}
            </span>
            <h2 className="font-display hero-title" style={{ fontSize: "2.4rem" }}>
              {user.profile?.coachName || user.email}
            </h2>
            <p className="muted mt-2">{user.email}</p>
            <p className="tiny muted mt-2">
              ID: {user.id} · Joined {formatDate(user.createdAt)} · Last login{" "}
              {formatDate(user.lastLoginAt)}
            </p>
          </section>

          <section className="glass panel-lg mb-5">
            <h3 className="section-title">Account permissions</h3>
            <p className="muted tiny mb-3">
              Controls platform access. Coach titles on the profile do not grant admin rights.
            </p>
            <div className="admin-role-row">
              <Field id="accountRole" label="Account role">
                <select
                  id="accountRole"
                  className="select"
                  value={pendingRole}
                  disabled={busy}
                  onChange={(e) => setPendingRole(e.target.value)}
                >
                  {ACCOUNT_ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role === ACCOUNT_ROLES.ADMIN ? "ADMIN (full platform)" : "USER (coach)"}
                    </option>
                  ))}
                </select>
              </Field>
              <button
                type="button"
                className="btn"
                disabled={!roleDirty || busy || demotingSelf}
                onClick={() => setConfirmRole(true)}
              >
                Save role
              </button>
            </div>
            {demotingSelf ? (
              <p className="text-danger tiny mt-2">You cannot remove your own admin access.</p>
            ) : null}
          </section>

          <section className="stat-grid mb-5">
            <Stat label="Teams" value={user.counts?.teams ?? 0} />
            <Stat label="Players" value={user.counts?.players ?? 0} />
            <Stat label="Evaluations" value={user.counts?.evaluations ?? 0} />
            <Stat label="Sessions" value={user.counts?.sessions ?? 0} />
          </section>

          <section className="glass panel-lg mb-5">
            <h3 className="section-title">Coach profile</h3>
            <dl className="detail-grid">
              <div>
                <dt>Organization</dt>
                <dd>{user.profile?.organizationName || "—"}</dd>
              </div>
              <div>
                <dt>Team</dt>
                <dd>{user.profile?.teamName || "—"}</dd>
              </div>
              <div>
                <dt>Identifier</dt>
                <dd>{user.profile?.teamIdentifier || "—"}</dd>
              </div>
              <div>
                <dt>Sport</dt>
                <dd>{user.profile?.sport || "—"}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{user.profile?.phoneNumber || "—"}</dd>
              </div>
              <div>
                <dt>Title (reports)</dt>
                <dd>{user.profile?.role || "—"}</dd>
              </div>
              <div>
                <dt>Email verified</dt>
                <dd>{user.isEmailVerified ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt>Theme / language</dt>
                <dd>
                  {user.settings?.theme || "—"} / {user.settings?.reportLanguage || "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="glass panel-lg mb-5">
            <h3 className="section-title">Teams ({user.teams?.length ?? 0})</h3>
            {(user.teams ?? []).length === 0 ? (
              <p className="muted">No teams</p>
            ) : (
              <ul className="plain-list">
                {user.teams.map((t) => (
                  <li key={t.id}>
                    <strong>{t.name}</strong>
                    <span className="muted tiny">
                      {" "}
                      · {t.sportId || "no sport"} · {t.identifier || "no id"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="glass panel-lg mb-5">
            <h3 className="section-title">Players (latest {user.players?.length ?? 0})</h3>
            {(user.players ?? []).length === 0 ? (
              <p className="muted">No players</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Sport</th>
                      <th>Position</th>
                      <th>Age</th>
                      <th>Evals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.players.map((p) => (
                      <tr key={p.id}>
                        <td>
                          {p.name}
                          {p.jerseyNumber ? ` #${p.jerseyNumber}` : ""}
                        </td>
                        <td>{p.sportId || "—"}</td>
                        <td>{p.position || "—"}</td>
                        <td>{p.age || "—"}</td>
                        <td>{p.evaluations?.length ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="glass panel-lg mb-5">
            <h3 className="section-title">Recent evaluations</h3>
            {(user.evaluations ?? []).length === 0 ? (
              <p className="muted">No evaluations</p>
            ) : (
              <ul className="plain-list">
                {user.evaluations.map((e) => (
                  <li key={e.id}>
                    <strong>{e.evaluationType}</strong>
                    <span className="muted tiny">
                      {" "}
                      · {e.sportId || "sport?"} · score {e.overallScore ?? "—"} ·{" "}
                      {formatDate(e.date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      <ConfirmDialog
        open={confirmRole}
        title="Change account role"
        message={`Set this account to ${pendingRole}? This changes platform permissions immediately.`}
        confirmLabel="Update role"
        cancelLabel="Cancel"
        busy={busy}
        onCancel={() => setConfirmRole(false)}
        onConfirm={applyRoleChange}
      />
    </main>
  );
}
