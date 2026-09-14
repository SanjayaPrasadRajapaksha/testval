const ACCESS_KEY = "evalscout_access_token";
const REFRESH_KEY = "evalscout_refresh_token";
const USER_KEY = "evalscout_user";
const REMEMBERED_EMAIL_KEY = "evalscout_remembered_email";
const PERSIST_KEY = "evalscout_persist_session";

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_KEY);
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getRememberedEmail() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(REMEMBERED_EMAIL_KEY) || "";
}

export function setRememberedEmail(email) {
  if (typeof window === "undefined") return;
  const value = String(email || "").trim().toLowerCase();
  if (value) localStorage.setItem(REMEMBERED_EMAIL_KEY, value);
}

export function clearRememberedEmail() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REMEMBERED_EMAIL_KEY);
}

export function setAuthSession(tokens, user, options = {}) {
  const remember = options.rememberMe !== false;
  localStorage.setItem(PERSIST_KEY, remember ? "1" : "0");

  // Clear both stores so we don't leave stale tokens behind.
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(USER_KEY);

  const target = remember ? localStorage : sessionStorage;
  target.setItem(ACCESS_KEY, tokens.accessToken);
  target.setItem(REFRESH_KEY, tokens.refreshToken);
  if (user) {
    target.setItem(USER_KEY, JSON.stringify(user));
    if (user.email && remember) setRememberedEmail(user.email);
  }
}

export function clearAuthSession() {
  // Tokens cleared on logout; remembered email kept for next login form
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(USER_KEY);
}
