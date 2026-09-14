import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  setAuthSession,
} from "./auth-storage";
import type {
  ApiErrorBody,
  AuthResponse,
  CoachProfile,
  Evaluation,
  Player,
  RankingsResponse,
  Settings,
  Sport,
  User,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = RequestInit & {
  auth?: boolean;
  skipRefresh?: boolean;
};

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      clearAuthSession();
      return false;
    }
    const data = (await res.json()) as AuthResponse;
    setAuthSession(
      { accessToken: data.accessToken, refreshToken: data.refreshToken },
      data.user,
    );
    return true;
  } catch {
    clearAuthSession();
    return false;
  }
}

async function refreshOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = tryRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, skipRefresh = false, headers, ...rest } = options;
  const finalHeaders = new Headers(headers);

  if (rest.body && !(rest.body instanceof FormData) && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getAccessToken();
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: finalHeaders,
  });

  if (res.status === 401 && auth && !skipRefresh) {
    const refreshed = await refreshOnce();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, skipRefresh: true });
    }
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const body = (data ?? {}) as ApiErrorBody;
    throw new ApiError(res.status, body.message || body.error || "Request failed", body.error || body.code);
  }

  return data as T;
}

export const api = {
  health: () => apiFetch<{ ok: boolean }>("/api/health", { auth: false }),

  register: (body: { email: string; password: string; coachName?: string }) =>
    apiFetch<AuthResponse>("/api/auth/register", {
      method: "POST",
      auth: false,
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    apiFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify(body),
    }),

  logout: async () => {
    const refreshToken = getRefreshToken();
    try {
      await apiFetch("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    } finally {
      clearAuthSession();
    }
  },

  forgotPassword: (email: string) =>
    apiFetch<{ ok: boolean }>("/api/auth/forgot-password", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    apiFetch<{ ok: boolean }>("/api/auth/reset-password", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ token, password }),
    }),

  verifyEmail: (token: string) =>
    apiFetch<{ ok: boolean }>("/api/auth/verify-email", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ token }),
    }),

  me: () => apiFetch<User>("/api/auth/me"),

  listSports: () => apiFetch<Sport[]>("/api/sports", { auth: false }),

  getSport: (id: string) => apiFetch<Sport>(`/api/sports/${id}`, { auth: false }),

  getRankings: (sportId: string) =>
    apiFetch<RankingsResponse>(`/api/sports/${sportId}/rankings`),

  resetSportData: (sportId: string) =>
    apiFetch<{ ok: boolean }>(`/api/sports/${sportId}/data`, { method: "DELETE" }),

  listPlayers: (params?: { sportId?: string; search?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.sportId) q.set("sportId", params.sportId);
    if (params?.search) q.set("search", params.search);
    if (params?.limit) q.set("limit", String(params.limit));
    const suffix = q.toString() ? `?${q}` : "";
    return apiFetch<Player[]>(`/api/players${suffix}`);
  },

  createPlayer: (body: Partial<Player> & { name: string }) =>
    apiFetch<Player>("/api/players", { method: "POST", body: JSON.stringify(body) }),

  updatePlayer: (id: string, body: Partial<Player>) =>
    apiFetch<Player>(`/api/players/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  deletePlayer: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/players/${id}`, { method: "DELETE" }),

  listEvaluations: (params?: { sportId?: string; playerId?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.sportId) q.set("sportId", params.sportId);
    if (params?.playerId) q.set("playerId", params.playerId);
    if (params?.limit) q.set("limit", String(params.limit));
    const suffix = q.toString() ? `?${q}` : "";
    return apiFetch<Evaluation[]>(`/api/evaluations${suffix}`);
  },

  createEvaluation: (body: Partial<Evaluation> & { playerId: string }) =>
    apiFetch<Evaluation>("/api/evaluations", { method: "POST", body: JSON.stringify(body) }),

  updateEvaluation: (id: string, body: Partial<Evaluation>) =>
    apiFetch<Evaluation>(`/api/evaluations/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteEvaluation: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/evaluations/${id}`, { method: "DELETE" }),

  getProfile: () => apiFetch<CoachProfile>("/api/coach-profile"),

  saveProfile: (body: CoachProfile) =>
    apiFetch<CoachProfile>("/api/coach-profile", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  getSettings: () => apiFetch<Settings>("/api/settings"),

  saveSettings: (body: Settings) =>
    apiFetch<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(body) }),
};
