/**
 * EvalScout access model
 *
 * Account roles (users/{uid}.role) control permissions.
 * Coach titles (coachProfiles.role) are display-only for reports.
 */

export const ACCOUNT_ROLES = Object.freeze({
  USER: "USER",
  ADMIN: "ADMIN",
});

export const ACCOUNT_ROLE_OPTIONS = Object.freeze([
  ACCOUNT_ROLES.USER,
  ACCOUNT_ROLES.ADMIN,
]);

/** Display titles on coach profile / PDFs — not permissions. */
export const COACH_TITLES = Object.freeze([
  "Head Coach",
  "Assistant Coach",
  "Evaluator",
  "Director",
]);

export function isAccountRole(value) {
  return ACCOUNT_ROLE_OPTIONS.includes(value);
}

export function isAdminRole(value) {
  return value === ACCOUNT_ROLES.ADMIN;
}

export function normalizeAccountRole(value) {
  return isAccountRole(value) ? value : ACCOUNT_ROLES.USER;
}

export function normalizeCoachTitle(value) {
  if (COACH_TITLES.includes(value)) return value;
  return COACH_TITLES[0];
}
