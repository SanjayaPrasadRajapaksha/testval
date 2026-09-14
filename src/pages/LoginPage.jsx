import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { Field } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import { sendEvalScoutEmailVerification } from "../lib/authEmail";
import { auth } from "../lib/firebase";
import { getRememberedEmail } from "../lib/auth-storage";
import { isAdminRole } from "../lib/roles";

export default function LoginPage() {
  const {
    login,
    logout,
    isAuthenticated,
    isAdmin,
    loading,
  } = useAuth();

  const navigate = useNavigate();

  const [email, setEmail] = useState(() => getRememberedEmail());
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Email verification modal
  const [showVerificationModal, setShowVerificationModal] =
    useState(false);

  const [verificationEmail, setVerificationEmail] =
    useState("");

  const [verificationMessage, setVerificationMessage] =
    useState("");

  const [resendBusy, setResendBusy] = useState(false);

  /**
   * Redirect authenticated users.
   *
   * Do not redirect while the authentication state
   * is still loading.
   */
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(isAdmin ? "/admin" : "/dashboard", {
        replace: true,
      });
    }
  }, [
    loading,
    isAuthenticated,
    isAdmin,
    navigate,
  ]);

  /**
   * Login submit
   */
async function onSubmit(event) {
  event.preventDefault();

  if (busy) return;

  setBusy(true);
  setError("");

  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedEmail) {
    setError("Enter your email address.");
    setBusy(false);
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    setError("Enter a valid email address.");
    setBusy(false);
    return;
  }

  if (!password) {
    setError("Enter your password.");
    setBusy(false);
    return;
  }

  try {
    const user = await login(trimmedEmail, password, {
      rememberMe,
    });

    // At this point the user is guaranteed to be verified.
    navigate(
      isAdminRole(user?.role)
        ? "/admin"
        : "/dashboard",
      { replace: true }
    );
  } catch (err) {
  console.error("Login error:", err);

  if (
    err instanceof ApiError &&
    err.code === "EMAIL_NOT_VERIFIED"
  ) {
    navigate("/verify-email", {
      replace: true,
      state: {
        email:
          err.details?.email ||
          trimmedEmail,
      },
    });

    return;
  }

  setError(
    err instanceof ApiError
      ? err.message
      : "Unable to sign in. Check your email and password."
  );
} finally {
  setBusy(false);
}
}
  /**
   * Resend verification email
   */
  async function handleResendVerification() {
    if (resendBusy) return;

    setResendBusy(true);
    setError("");

    try {
      /**
       * If the user is currently logged out, Firebase does not
       * have a current user to send the verification email to.
       *
       * Therefore we temporarily log the user in again.
       */
      let firebaseUser = auth.currentUser;

      if (!firebaseUser) {
        try {
          await login(
            verificationEmail,
            password,
            {
              rememberMe: false,
            }
          );

          firebaseUser = auth.currentUser;
        } catch (err) {
          setVerificationMessage(
            "Please enter your password and try signing in again to resend the verification email."
          );

          return;
        }
      }

      if (!firebaseUser) {
        throw new Error(
          "Firebase user is not available."
        );
      }

      /**
       * Send verification email.
       */
      await sendEvalScoutEmailVerification(firebaseUser);

      setVerificationMessage(
        "A new verification email has been sent. Check inbox and spam — it may come from noreply@evalscout-cb68e.firebaseapp.com."
      );

      /**
       * Sign out again because the email is still
       * unverified.
       */
      try {
        await logout();
      } catch (logoutError) {
        console.error(
          "Logout after resend failed:",
          logoutError
        );
      }
    } catch (err) {
      console.error(
        "Resend verification error:",
        err
      );

      if (
        err?.code ===
        "auth/too-many-requests"
      ) {
        setVerificationMessage(
          "Too many verification emails have been requested. Please wait a few minutes and try again."
        );
      } else {
        setVerificationMessage(
          "Unable to send the verification email. Please try again later."
        );
      }
    } finally {
      setResendBusy(false);
    }
  }

  /**
   * Close verification modal
   */
  function closeVerificationModal() {
    setShowVerificationModal(false);
    setVerificationMessage("");
  }

  return (
    <main className="page">
      <AppHeader subtitle="Coach sign in" />

      <section className="glass panel-lg max-md">
        <h2
          className="font-display"
          style={{
            fontSize: "1.85rem",
            margin: 0,
          }}
        >
          Welcome back
        </h2>

        <p
          className="mt-2 muted"
          style={{
            fontSize: "0.9rem",
          }}
        >
          Sign in to manage rosters and evaluations.
        </p>

        <form
          className="stack mt-6"
          onSubmit={onSubmit}
          noValidate
        >
          {/* Email */}
          <Field
            id="email"
            label="Email"
            hint="Remembered from your last login. This fills your coach profile and PDF reports."
          >
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              disabled={busy}
            />
          </Field>

          {/* Password */}
          <Field
            id="password"
            label="Password"
          >
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              disabled={busy}
            />
          </Field>

          {/* Remember me */}
          <label className="remember-me">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) =>
                setRememberMe(e.target.checked)
              }
              disabled={busy}
            />

            Remember me on this device
          </label>

          {/* Error */}
          {error ? (
            <p
              className="text-danger"
              style={{
                fontSize: "0.9rem",
              }}
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {/* Login button */}
          <button
            className="btn"
            type="submit"
            disabled={busy}
          >
            {busy
              ? "Signing in…"
              : "Sign in"}
          </button>
        </form>

        {/* Links */}
        <div className="link-row">
          <Link
            to="/forgot-password"
            className="link-lime"
          >
            Forgot password
          </Link>

          <Link
            to="/register"
            className="link-muted"
          >
            Create account
          </Link>
        </div>
      </section>

      {/* =====================================================
          EMAIL VERIFICATION MODAL
          ===================================================== */}
      {showVerificationModal && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="verification-title"
        >
          <div className="glass panel-lg max-md">
            <div
              style={{
                textAlign: "center",
              }}
            >
              {/* Icon */}
              <div
                style={{
                  fontSize: "3rem",
                  marginBottom: "1rem",
                }}
              >
                ✉️
              </div>

              {/* Title */}
              <h2
                id="verification-title"
                className="font-display"
                style={{
                  fontSize: "1.7rem",
                  margin: 0,
                }}
              >
                Verify your email
              </h2>

              {/* Email */}
              <p
                className="muted mt-2"
                style={{
                  fontSize: "0.9rem",
                }}
              >
                We sent a verification email to:
              </p>

              <p
                style={{
                  fontWeight: 600,
                  wordBreak: "break-word",
                }}
              >
                {verificationEmail}
              </p>

              {/* Message */}
              {verificationMessage ? (
                <p
                  className="muted"
                  style={{
                    fontSize: "0.9rem",
                    lineHeight: 1.5,
                  }}
                >
                  {verificationMessage}
                </p>
              ) : null}

              {/* Instructions */}
              <p
                className="muted"
                style={{
                  fontSize: "0.85rem",
                  lineHeight: 1.5,
                  marginTop: "1rem",
                }}
              >
                Open the email and click the verification
                link. If it is not in your inbox, check
                spam or junk. After verifying, return here
                and sign in again.
              </p>

              {/* Buttons */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  marginTop: "1.5rem",
                }}
              >
                <button
                  type="button"
                  className="btn"
                  onClick={
                    handleResendVerification
                  }
                  disabled={resendBusy}
                >
                  {resendBusy
                    ? "Sending…"
                    : "Resend verification email"}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={
                    closeVerificationModal
                  }
                >
                  Back to sign in
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}