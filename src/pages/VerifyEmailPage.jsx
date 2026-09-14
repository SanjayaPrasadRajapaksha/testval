import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";

import { AppHeader } from "../components/AppHeader";
import { sendEvalScoutEmailVerification } from "../lib/authEmail";
import { auth } from "../lib/firebase";

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const verificationEmail = location.state?.email || "";

  const [verificationMessage, setVerificationMessage] = useState(
    "A verification email has been sent to your email address."
  );

  const [resendBusy, setResendBusy] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);

  async function handleResendVerification() {
    if (resendBusy) return;

    setResendBusy(true);

    try {
      const firebaseUser = auth.currentUser;

      if (!firebaseUser) {
        setVerificationMessage(
          "Please sign in again to resend the verification email."
        );
        return;
      }

      await sendEvalScoutEmailVerification(firebaseUser);

      setVerificationMessage(
        "A new verification email has been sent. Check inbox and spam — it may come from noreply@evalscout-cb68e.firebaseapp.com."
      );
    } catch (err) {
      console.error("Failed to resend verification email:", err);

      if (err?.code === "auth/too-many-requests") {
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

  async function handleBackToLogin() {
    if (loginBusy) return;

    setLoginBusy(true);

    try {
      // Important:
      // Registration leaves the Firebase user signed in.
      // Sign out before going to login so AuthContext
      // doesn't redirect the user to the dashboard.
      if (auth.currentUser) {
        await signOut(auth);
      }

      navigate("/login", {
        replace: true,
      });
    } catch (err) {
      console.error("Failed to sign out:", err);

      // Even if signOut fails, still try to go to login.
      navigate("/login", {
        replace: true,
      });
    } finally {
      setLoginBusy(false);
    }
  }

  return (
    <main className="page">
      <AppHeader subtitle="Coach sign in" />

      <section className="glass panel-lg max-md">
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
            className="font-display"
            style={{
              fontSize: "1.7rem",
              margin: 0,
            }}
          >
            Verify your email
          </h2>

          {/* Description */}
          <p
            className="muted mt-2"
            style={{
              fontSize: "0.9rem",
            }}
          >
            We sent a verification email to:
          </p>

          {/* Email */}
          <p
            style={{
              fontWeight: 600,
              wordBreak: "break-word",
              marginBottom: "1rem",
            }}
          >
            {verificationEmail}
          </p>

          {/* Verification message */}
          <p
            className="muted"
            style={{
              fontSize: "0.9rem",
              lineHeight: 1.5,
            }}
          >
            {verificationMessage}
          </p>

          {/* Instructions */}
          <p
            className="muted"
            style={{
              fontSize: "0.85rem",
              lineHeight: 1.5,
              marginTop: "1rem",
            }}
          >
            Open the email and click the verification link. If it is
            not in your inbox, check spam or junk — Firebase currently
            sends it from noreply@evalscout-cb68e.firebaseapp.com.
            After verifying, return here and sign in again.
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
              onClick={handleResendVerification}
              disabled={resendBusy || loginBusy}
            >
              {resendBusy
                ? "Sending…"
                : "Resend verification email"}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleBackToLogin}
              disabled={resendBusy || loginBusy}
            >
              {loginBusy ? "Signing out…" : "Back to sign in"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}