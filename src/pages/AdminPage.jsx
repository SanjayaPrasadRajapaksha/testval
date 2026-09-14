// import { useCallback, useEffect, useState } from "react";
// import { Link } from "react-router-dom";
// import { AppHeader } from "../components/AppHeader";
// import { RequireAdmin } from "../components/RequireAdmin";
// import { EmptyState, Stat } from "../components/ui";
// import { api, ApiError } from "../lib/api";
// import { isAdminRole } from "../lib/roles";

// function formatDate(value) {
//   if (!value) return "—";
//   try {
//     return new Date(value).toLocaleString();
//   } catch {
//     return String(value);
//   }
// }

// export default function AdminPage() {
//   return (
//     <RequireAdmin>
//       <AdminDashboard />
//     </RequireAdmin>
//   );
// }

// function AdminDashboard() {
//   const [overview, setOverview] = useState(null);
//   const [users, setUsers] = useState([]);
//   const [meta, setMeta] = useState(null);
//   const [search, setSearch] = useState("");
//   const [page, setPage] = useState(1);
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(true);

//   const load = useCallback(async () => {
//     setLoading(true);
//     setError("");
//     try {
//       const [ov, list] = await Promise.all([
//         api.adminOverview(),
//         api.adminListUsers({ page, limit: 20, search: search.trim() || undefined }),
//       ]);
//       setOverview(ov);
//       setUsers(list.data ?? []);
//       setMeta(list.meta ?? null);
//     } catch (err) {
//       setError(err instanceof ApiError ? err.message : "Failed to load admin data");
//     } finally {
//       setLoading(false);
//     }
//   }, [page, search]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   function onSearchSubmit(event) {
//     event.preventDefault();
//     setPage(1);
//     load();
//   }

//   return (
//     <main className="page">
//       <AppHeader subtitle="Super Admin" />

//       <section className="glass panel-lg mb-5">
//         <span className="badge">Platform oversight</span>
//         <h2 className="font-display hero-title">All coaches &amp; accounts</h2>
//         <p className="muted mt-2">
//           Review every registered user, profile, roster counts, and evaluations.
//         </p>
//       </section>

//       {error ? (
//         <p className="text-danger mb-4" role="alert">
//           {error}
//         </p>
//       ) : null}

//       {overview ? (
//         <section className="stat-grid mb-5">
//           <Stat label="Users" value={overview.totals.users} />
//           <Stat label="Coaches" value={overview.totals.coaches} />
//           <Stat label="Admins" value={overview.totals.admins} />
//           <Stat label="Players" value={overview.totals.players} />
//           <Stat label="Evaluations" value={overview.totals.evaluations} />
//           <Stat label="Teams" value={overview.totals.teams} />
//         </section>
//       ) : null}

//       <section className="glass panel-lg mb-5">
//         <form className="admin-search" onSubmit={onSearchSubmit}>
//           <input
//             className="input"
//             type="search"
//             placeholder="Search email, coach, org, team…"
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             aria-label="Search users"
//           />
//           <button className="btn" type="submit">
//             Search
//           </button>
//         </form>
//       </section>

//       {loading ? <p className="muted">Loading users…</p> : null}

//       {!loading && users.length === 0 ? (
//         <EmptyState title="No users found" body="Try a different search, or wait for coaches to register." />
//       ) : (
//         <section className="admin-table-wrap glass">
//           <table className="admin-table">
//             <thead>
//               <tr>
//                 <th>Email</th>
//                 <th>Role</th>
//                 <th>Coach / Org</th>
//                 <th>Counts</th>
//                 <th>Last login</th>
//                 <th></th>
//               </tr>
//             </thead>
//             <tbody>
//               {users.map((u) => (
//                 <tr key={u.id}>
//                   <td>
//                     <div className="admin-email">{u.email}</div>
//                     <div className="muted tiny">
//                       {u.isEmailVerified ? "Verified" : "Unverified"} · joined {formatDate(u.createdAt)}
//                     </div>
//                   </td>
//                   <td>
//                     <span className={`role-pill ${isAdminRole(u.role) ? "role-pill--admin" : ""}`}>
//                       {u.role}
//                     </span>
//                   </td>
//                   <td>
//                     <div>{u.profile?.coachName || "—"}</div>
//                     <div className="muted tiny">
//                       {[u.profile?.organizationName, u.profile?.teamName].filter(Boolean).join(" · ") ||
//                         "No profile yet"}
//                     </div>
//                   </td>
//                   <td className="tiny">
//                     {u.counts?.teams ?? 0} teams · {u.counts?.players ?? 0} players ·{" "}
//                     {u.counts?.evaluations ?? 0} evals
//                   </td>
//                   <td className="tiny">{formatDate(u.lastLoginAt)}</td>
//                   <td>
//                     <Link className="btn btn-secondary btn-sm" to={`/admin/users/${u.id}`}>
//                       View
//                     </Link>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </section>
//       )}

//       {meta && meta.totalPages > 1 ? (
//         <div className="pager">
//           <button
//             type="button"
//             className="btn btn-secondary"
//             disabled={!meta.hasPrev}
//             onClick={() => setPage((p) => Math.max(1, p - 1))}
//           >
//             Previous
//           </button>
//           <span className="muted tiny">
//             Page {meta.page} / {meta.totalPages}
//           </span>
//           <button
//             type="button"
//             className="btn btn-secondary"
//             disabled={!meta.hasNext}
//             onClick={() => setPage((p) => p + 1)}
//           >
//             Next
//           </button>
//         </div>
//       ) : null}
//     </main>
//   );
// }
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { RequireAdmin } from "../components/RequireAdmin";
import { EmptyState, Stat } from "../components/ui";
import { api, ApiError } from "../lib/api";
import { isAdminRole } from "../lib/roles";

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function normalizeOverview(response) {
  // Support:
  // { totals: {...} }
  // { data: { totals: {...} } }
  // { result: { totals: {...} } }
  // { data: { data: { totals: {...} } } }

  const source =
    response?.totals
      ? response
      : response?.data?.totals
        ? response.data
        : response?.result?.totals
          ? response.result
          : response?.data?.data?.totals
            ? response.data.data
            : {};

  return {
    totals: {
      users: Number(source?.totals?.users ?? 0),
      coaches: Number(source?.totals?.coaches ?? 0),
      admins: Number(source?.totals?.admins ?? 0),
      players: Number(source?.totals?.players ?? 0),
      evaluations: Number(source?.totals?.evaluations ?? 0),
      teams: Number(source?.totals?.teams ?? 0),
    },
  };
}

function normalizeUsersResponse(response) {
  // Support common API response formats.

  if (Array.isArray(response)) {
    return {
      data: response,
      meta: null,
    };
  }

  if (Array.isArray(response?.data)) {
    return {
      data: response.data,
      meta: response.meta ?? null,
    };
  }

  if (Array.isArray(response?.result)) {
    return {
      data: response.result,
      meta: response.meta ?? null,
    };
  }

  if (Array.isArray(response?.data?.data)) {
    return {
      data: response.data.data,
      meta: response.data.meta ?? response.meta ?? null,
    };
  }

  if (Array.isArray(response?.result?.data)) {
    return {
      data: response.result.data,
      meta: response.result.meta ?? response.meta ?? null,
    };
  }

  return {
    data: [],
    meta: response?.meta ?? null,
  };
}

export default function AdminPage() {
  return (
    <RequireAdmin>
      <AdminDashboard />
    </RequireAdmin>
  );
}

function AdminDashboard() {
  const [overview, setOverview] = useState({
    totals: {
      users: 0,
      coaches: 0,
      admins: 0,
      players: 0,
      evaluations: 0,
      teams: 0,
    },
  });

  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [overviewResponse, usersResponse] = await Promise.all([
        api.adminOverview(),
        api.adminListUsers({
          page,
          limit: 20,
          search: search.trim() || undefined,
        }),
      ]);

      console.log("ADMIN OVERVIEW RESPONSE:", overviewResponse);
      console.log("ADMIN USERS RESPONSE:", usersResponse);

      const normalizedOverview = normalizeOverview(overviewResponse);
      const normalizedUsers = normalizeUsersResponse(usersResponse);

      setOverview(normalizedOverview);
      setUsers(normalizedUsers.data);
      setMeta(normalizedUsers.meta);
    } catch (err) {
      console.error("Admin page error:", err);

      setError(
        err instanceof ApiError
          ? err.message
          : err?.message || "Failed to load admin data"
      );

      setOverview({
        totals: {
          users: 0,
          coaches: 0,
          admins: 0,
          players: 0,
          evaluations: 0,
          teams: 0,
        },
      });

      setUsers([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  function onSearchSubmit(event) {
    event.preventDefault();

    if (page !== 1) {
      setPage(1);
      return;
    }

    load();
  }

  return (
    <main className="page">
      <AppHeader subtitle="Super Admin" />

      {/* Header */}
      <section className="glass panel-lg mb-5">
        <span className="badge">Platform oversight</span>

        <h2 className="font-display hero-title">
          All coaches &amp; accounts
        </h2>

        <p className="muted mt-2">
          Review every registered user, profile, roster counts, and
          evaluations.
        </p>
      </section>

      {/* Error */}
      {error ? (
        <div className="glass panel-lg mb-5">
          <p className="text-danger" role="alert">
            {error}
          </p>

          <button
            type="button"
            className="btn btn-secondary mt-3"
            onClick={load}
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Statistics */}
      <section className="stat-grid mb-5">
        <Stat
          label="Users"
          value={overview?.totals?.users ?? 0}
        />

        <Stat
          label="Coaches"
          value={overview?.totals?.coaches ?? 0}
        />

        <Stat
          label="Admins"
          value={overview?.totals?.admins ?? 0}
        />

        <Stat
          label="Players"
          value={overview?.totals?.players ?? 0}
        />

        <Stat
          label="Evaluations"
          value={overview?.totals?.evaluations ?? 0}
        />

        <Stat
          label="Teams"
          value={overview?.totals?.teams ?? 0}
        />
      </section>

      {/* Search */}
      <section className="glass panel-lg mb-5">
        <form className="admin-search" onSubmit={onSearchSubmit}>
          <input
            className="input"
            type="search"
            placeholder="Search email, coach, org, team…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search users"
          />

          <button
            className="btn"
            type="submit"
            disabled={loading}
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </form>
      </section>

      {/* Loading */}
      {loading ? (
        <p className="muted mb-4">
          Loading users…
        </p>
      ) : null}

      {/* No users */}
      {!loading && users.length === 0 ? (
        <EmptyState
          title="No users found"
          body="Try a different search, or wait for coaches to register."
        />
      ) : null}

      {/* Users table */}
      {!loading && users.length > 0 ? (
        <section className="admin-table-wrap glass">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Coach / Org</th>
                <th>Counts</th>
                <th>Last login</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {users.map((u) => (
                <tr key={u?.id}>
                  {/* Email */}
                  <td>
                    <div className="admin-email">
                      {u?.email || "—"}
                    </div>

                    <div className="muted tiny">
                      {u?.isEmailVerified
                        ? "Verified"
                        : "Unverified"}{" "}
                      · joined {formatDate(u?.createdAt)}
                    </div>
                  </td>

                  {/* Role */}
                  <td>
                    <span
                      className={`role-pill ${
                        isAdminRole(u?.role)
                          ? "role-pill--admin"
                          : ""
                      }`}
                    >
                      {u?.role || "user"}
                    </span>
                  </td>

                  {/* Profile */}
                  <td>
                    <div>
                      {u?.profile?.coachName || "—"}
                    </div>

                    <div className="muted tiny">
                      {[
                        u?.profile?.organizationName,
                        u?.profile?.teamName,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "No profile yet"}
                    </div>
                  </td>

                  {/* Counts */}
                  <td className="tiny">
                    {u?.counts?.teams ?? 0} teams ·{" "}
                    {u?.counts?.players ?? 0} players ·{" "}
                    {u?.counts?.evaluations ?? 0} evals
                  </td>

                  {/* Last login */}
                  <td className="tiny">
                    {formatDate(u?.lastLoginAt)}
                  </td>

                  {/* View */}
                  <td>
                    {u?.id ? (
                      <Link
                        className="btn btn-secondary btn-sm"
                        to={`/admin/users/${u.id}`}
                      >
                        View
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {/* Pagination */}
      {meta && Number(meta?.totalPages) > 1 ? (
        <div className="pager">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!meta?.hasPrev || loading}
            onClick={() =>
              setPage((p) => Math.max(1, p - 1))
            }
          >
            Previous
          </button>

          <span className="muted tiny">
            Page {meta?.page ?? page} /{" "}
            {meta?.totalPages ?? 1}
          </span>

          <button
            type="button"
            className="btn btn-secondary"
            disabled={!meta?.hasNext || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </main>
  );
}