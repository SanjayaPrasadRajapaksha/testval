import { sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";

const APP_ORIGIN = "https://evalscout.hasthiya.com";

/** After the Firebase verify/reset link is used, land on the branded site. */
export function emailActionSettings() {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : APP_ORIGIN;
  return {
    url: `${origin}/login`,
    handleCodeInApp: false,
  };
}

export function sendEvalScoutEmailVerification(user) {
  return sendEmailVerification(user, emailActionSettings());
}

export function sendEvalScoutPasswordReset(auth, email) {
  return sendPasswordResetEmail(auth, email, emailActionSettings());
}
