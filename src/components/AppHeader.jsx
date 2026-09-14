import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { ConfirmDialog } from "./ConfirmDialog";
import { LogoMark } from "./LogoMark";

const nav = [
  { href: "/dashboard", label: "Sports" },
  { href: "/reports", label: "Reports" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
];

export function AppHeader({
  title = "EVALSCOUT",
  subtitle = "Multi-Sport Evaluation Platform",
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    user,
    logout,
    isAuthenticated,
  } = useAuth();

  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);

  // Check admin from logged-in user
  const isAdmin =
    user?.role?.toLowerCase() === "admin" ||
    user?.user_role?.toLowerCase() === "admin";

  // Load profile logo
  useEffect(() => {
    if (!isAuthenticated) {
      setLogoUrl(null);
      return;
    }

    let cancelled = false;

    api
      .getProfile()
      .then((profile) => {
        if (!cancelled) {
          setLogoUrl(
            profile?.logoUrl ||
              profile?.logo_url ||
              null
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLogoUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, location.pathname]);

  // Close modal when route changes
  useEffect(() => {
    setShowSignUp(false);
  }, [location.pathname]);

  // Prevent background scrolling while modal is open; the overlay itself scrolls.
  useEffect(() => {
    if (!showSignUp) return;

    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");

    return () => {
      document.documentElement.classList.remove("modal-open");
      document.body.classList.remove("modal-open");
    };
  }, [showSignUp]);

  async function handleLogout() {
    setBusy(true);

    try {
      await logout();
      setConfirmSignOut(false);
      navigate("/login", { replace: true });
    } finally {
      setBusy(false);
    }
  }

  // Admin navigation
  const items = isAdmin
    ? [
        {
          href: "/admin",
          label: "Admin",
          variant: "admin",
        },
        ...nav,
      ]
    : nav;

  const initials = (
    user?.email || "U"
  )
    .slice(0, 1)
    .toUpperCase();

  return (
    <>
      <header className="glass app-header">
        {/* Logo / Brand */}
        <Link
          to={
            isAuthenticated
              ? isAdmin
                ? "/admin"
                : "/dashboard"
              : "/"
          }
          className="app-header__brand"
        >
          <LogoMark />

          <div className="app-header__titles">
            <h1 className="font-display text-lime">
              {title}
            </h1>

            <p className="eyebrow muted">
              {subtitle}
            </p>
          </div>
        </Link>

        {/* Navigation */}
        {isAuthenticated ? (
          <nav
            className="app-header__nav"
            aria-label="Main"
          >
            {items.map((item) => {
              const active =
                location.pathname === item.href ||
                location.pathname.startsWith(
                  `${item.href}/`
                );

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`nav-chip ${
                    item.variant === "admin"
                      ? "nav-chip--admin"
                      : ""
                  } ${
                    active
                      ? "nav-chip--active"
                      : ""
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Profile Avatar */}
            <Link
              to="/profile"
              className="header-avatar"
              title="Profile"
              aria-label="Open profile"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Profile"
                />
              ) : (
                <span>{initials}</span>
              )}
            </Link>

            {/* Sign Out */}
            <button
              type="button"
              onClick={() =>
                setConfirmSignOut(true)
              }
              className="nav-chip"
              aria-label={`Sign out ${
                user?.email ?? ""
              }`}
            >
              Sign out
            </button>
          </nav>
        ) : (
          /* Guest Navigation */
          <nav
            className="app-header__nav"
            aria-label="Authentication"
          >
            <Link
              to="/login"
              className="nav-chip"
            >
              Sign in
            </Link>

            <button
              type="button"
              className="nav-chip nav-chip--active"
              onClick={() =>
                setShowSignUp(true)
              }
            >
              Sign up
            </button>
          </nav>
        )}
      </header>

      {/* ================================
          SIGN UP POPUP
          ================================ */}
      {showSignUp && (
        <div
          className="signup-modal-overlay"
          onClick={() =>
            setShowSignUp(false)
          }
        >
          <div
            className="signup-modal glass"
            role="dialog"
            aria-modal="true"
            aria-labelledby="signup-modal-title"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* Close button */}
            <button
              type="button"
              className="signup-modal-close"
              onClick={() =>
                setShowSignUp(false)
              }
              aria-label="Close"
            >
              ×
            </button>

            {/* Icon */}
            <div className="signup-modal-icon">
              ✨
            </div>

            {/* Title */}
            <h2
              id="signup-modal-title"
              className="font-display"
            >
              Join EvalScout
            </h2>

            {/* Description */}
            <p className="muted signup-modal-description">
              Create your coach account and start
              evaluating your athletes.
            </p>

            {/* Buttons */}
            <div className="signup-modal-actions">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setShowSignUp(false);
                  navigate("/register");
                }}
              >
                Create Coach Account
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowSignUp(false);
                  navigate("/login");
                }}
              >
                I already have an account
              </button>
            </div>

            <p className="muted signup-modal-footer">
              By creating an account, you can securely
              manage your sports evaluations.
            </p>
          </div>
        </div>
      )}

      {/* ================================
          SIGN OUT CONFIRMATION
          ================================ */}
      <ConfirmDialog
        open={confirmSignOut}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        danger
        busy={busy}
        onCancel={() =>
          setConfirmSignOut(false)
        }
        onConfirm={handleLogout}
      />
    </>
  );
}