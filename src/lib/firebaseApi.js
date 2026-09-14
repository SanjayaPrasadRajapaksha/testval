import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  limit as fsLimit,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import localSports from "../data/sports.json";
import { auth, db, firebaseApp, initAnalytics, storage } from "./firebase";
import { sendEvalScoutEmailVerification, sendEvalScoutPasswordReset } from "./authEmail";
import { ageFromBirthday } from "./playerAge";
import {
  ACCOUNT_ROLES,
  isAdminRole,
  normalizeAccountRole,
  normalizeCoachTitle,
} from "./roles";

export class ApiError extends Error {
  constructor(status, message, code, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function requireUser() {
  const user = auth.currentUser;
  if (!user) throw new ApiError(401, "Authentication required", "NOT_LOGGED_IN");
  return user;
}

async function requireAdminSession() {
  const session = await loadSession();
  if (!isAdminRole(session.user?.role)) {
    throw new ApiError(403, "Admin only", "FORBIDDEN");
  }
  return session;
}

async function writeAuditLog({ action, targetUserId = null, meta = {} }) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await setDoc(doc(db, "auditLogs", newId()), {
      action: String(action || "unknown").slice(0, 120),
      actorUid: user.uid,
      actorEmail: user.email || "",
      targetUserId: targetUserId || null,
      meta: meta && typeof meta === "object" ? meta : {},
      createdAt: serverTimestamp(),
    });
  } catch {
    /* audit must never break the primary action */
  }
}

async function countForCoach(collectionName, coachId) {
  const snap = await getDocs(query(collection(db, collectionName), where("coachId", "==", coachId)));
  return snap.size;
}

async function enrichAdminUser(uid, userData) {
  const [profileSnap, settingsSnap, players, evaluations] = await Promise.all([
    getDoc(doc(db, "coachProfiles", uid)),
    getDoc(doc(db, "userSettings", uid)),
    countForCoach("players", uid),
    countForCoach("evaluations", uid),
  ]);
  const mapped = mapUser(uid, userData || {});
  return {
    ...mapped,
    profile: mapProfile(uid, profileSnap.data() || {}),
    settings: settingsSnap.data() || null,
    counts: {
      teams: 0,
      players,
      evaluations,
      sessions: 0,
    },
  };
}

async function ensureUserDocs(user, { coachName, role } = {}) {
  const uid = user.uid;

  const userRef = doc(db, "users", uid);
  const profileRef = doc(db, "coachProfiles", uid);
  const settingsRef = doc(db, "userSettings", uid);

  const requestedRole = role ? normalizeAccountRole(role) : null;

  const existing = await getDoc(userRef);

  if (!existing.exists()) {
    await setDoc(userRef, {
      email: (user.email || "").toLowerCase(),
      role: requestedRole || ACCOUNT_ROLES.USER,

      // Firebase Auth is the source of truth.
      isEmailVerified: Boolean(user.emailVerified),

      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
  } else {
    const updates = {
      // Keep this synchronized with Firebase Auth.
      isEmailVerified: Boolean(user.emailVerified),
      lastLoginAt: serverTimestamp(),
    };

    if (requestedRole) {
      updates.role = requestedRole;
    }

    await updateDoc(userRef, updates);
  }

  const profileSnap = await getDoc(profileRef);

  if (!profileSnap.exists()) {
    await setDoc(profileRef, {
      coachId: uid,
      coachName: coachName || user.displayName || "",
      displayName: coachName || user.displayName || "",
      coachEmail: user.email || "",
      email: user.email || "",
      phoneNumber: "",
      organizationName: "",
      orgName: "",
      teamName: "",
      teamIdentifier: "",
      sport: "",
      sportsCsv: "",
      role: normalizeCoachTitle("Head Coach"),
      logoUrl: null,
      updatedAt: serverTimestamp(),
    });
  } else {
    const current = profileSnap.data() || {};
    const nextEmail = current.coachEmail || current.email || user.email || "";
    if (!current.coachEmail || !current.email) {
      await updateDoc(profileRef, {
        coachEmail: nextEmail,
        email: current.email || nextEmail,
        updatedAt: serverTimestamp(),
      });
    }
  }

  const settingsSnap = await getDoc(settingsRef);

  if (!settingsSnap.exists()) {
    await setDoc(settingsRef, {
      theme: "dark",
      reportLanguage: "english",
      defaultRosterSize: 18,
      notificationsEnabled: true,
      updatedAt: serverTimestamp(),
    });
  }
}

function mapProfile(uid, data = {}) {
  return {
    id: uid,
    coachId: uid,
    coachName: data.coachName || data.displayName || "",
    displayName: data.displayName || data.coachName || "",
    coachEmail: data.coachEmail || data.email || "",
    email: data.email || data.coachEmail || "",
    phoneNumber: data.phoneNumber || "",
    organizationName: data.organizationName || data.orgName || "",
    orgName: data.orgName || data.organizationName || "",
    teamName: data.teamName || "",
    teamIdentifier: data.teamIdentifier || "",
    sport: data.sport || data.sportsCsv || "",
    sportsCsv: data.sportsCsv || data.sport || "",
    role: normalizeCoachTitle(data.role),
    logoUrl: data.logoUrl || null,
  };
}

function mapUser(uid, data = {}, authUser) {
  return {
    id: uid,
    email: data.email || authUser?.email || "",
    role: normalizeAccountRole(data.role),

    // Firebase Auth is authoritative.
    isEmailVerified: Boolean(authUser?.emailVerified),

    createdAt: data.createdAt || null,
    lastLoginAt: data.lastLoginAt || null,
  };
}

function authPayload(user, userDoc, profile, settings) {
  return {
    coachId: user.uid,
    email: user.email,
    accessToken: "firebase",
    refreshToken: "firebase",
    user: mapUser(user.uid, userDoc, user),
    profile: profile ? mapProfile(user.uid, profile) : null,
    settings: settings || null,
  };
}

async function loadSession() {
  const user = requireUser();
  await ensureUserDocs(user);
  const [userSnap, profileSnap, settingsSnap] = await Promise.all([
    getDoc(doc(db, "users", user.uid)),
    getDoc(doc(db, "coachProfiles", user.uid)),
    getDoc(doc(db, "userSettings", user.uid)),
  ]);
  return authPayload(
    user,
    userSnap.data() || {},
    profileSnap.data() || {},
    settingsSnap.data() || {},
  );
}

function overallFromScores(scores = {}) {
  const values = Object.values(scores).map(Number).filter((n) => !Number.isNaN(n));
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function mapFirebaseError(err) {
  const code = err?.code || "";
  if (code === "auth/email-already-in-use") {
    return new ApiError(409, "An account with this email already exists", "EMAIL_IN_USE");
  }
  if (code === "auth/invalid-email") {
    return new ApiError(400, "Enter a valid email address.", "VALIDATION_ERROR");
  }
  if (code === "auth/weak-password") {
    return new ApiError(400, "Password must be at least 8 characters.", "VALIDATION_ERROR");
  }
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }
  if (code === "auth/too-many-requests") {
    return new ApiError(429, "Too many attempts. Please wait a moment and try again.", "RATE_LIMIT");
  }
  if (code === "permission-denied" || code === "storage/unauthorized") {
    return new ApiError(
      403,
      "Firebase denied this save. Deploy Firestore/Storage security rules that allow signed-in coaches to write their own data.",
      "PERMISSION_DENIED",
    );
  }
  if (err instanceof ApiError) return err;
  return new ApiError(500, err?.message || "Something went wrong. Please try again.", code || "FIREBASE_ERROR");
}

async function listSportsFromDb() {
  try {
    const snap = await getDocs(collection(db, "sports"));
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  } catch {
    // fall through to bundled catalog
  }
  return localSports;
}

export const api = {
  health: async () => ({ ok: true, service: "EvalScout Firebase", version: "2.0.0" }),

register: async ({ email, password, coachName, role }) => {
  try {
    const cred = await createUserWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password
    );

    if (coachName) {
      await updateProfile(cred.user, {
        displayName: coachName,
      });
    }

    await ensureUserDocs(cred.user, { coachName, role });

    await sendEvalScoutEmailVerification(cred.user);

    initAnalytics();

    return loadSession();
  } catch (err) {
    throw mapFirebaseError(err);
  }
},

login: async ({ email, password }) => {
  try {
    const cred = await signInWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password
    );

    await cred.user.reload();

    // Only verified users are allowed to stay logged in
    if (!cred.user.emailVerified) {
      await signOut(auth);

      throw new ApiError(
        403,
        "Please verify your email address before signing in.",
        "EMAIL_NOT_VERIFIED",
        {
          email: cred.user.email,
        }
      );
    }

    // Only verified users reach this point
    await ensureUserDocs(cred.user);

    initAnalytics();

    return loadSession();
  } catch (err) {
    throw mapFirebaseError(err);
  }
},

resendVerificationEmail: async ({ email, password }) => {
  try {
    const cred = await signInWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password
    );

    const firebaseUser = cred.user;

    await firebaseUser.reload();

    if (firebaseUser.emailVerified) {
      await signOut(auth);

      return {
        alreadyVerified: true,
      };
    }

    await sendEvalScoutEmailVerification(firebaseUser);

    await signOut(auth);

    return {
      ok: true,
    };
  } catch (err) {
    try {
      await signOut(auth);
    } catch {
      // Ignore sign-out failure.
    }

    throw mapFirebaseError(err);
  }
},

  logout: async () => {
    await signOut(auth);
  },

  forgotPassword: async (email) => {
    try {
      await sendEvalScoutPasswordReset(auth, String(email || "").trim().toLowerCase());
    } catch {
      /* always succeed to avoid email enumeration */
    }
    return { ok: true };
  },

  resetPassword: async () => {
    throw new ApiError(
      400,
      "Use the password reset link from your email. Firebase handles reset tokens in the link.",
      "USE_EMAIL_LINK",
    );
  },

verifyEmail: async () => {
  try {
    const user = requireUser();

    await user.reload();

    if (!user.emailVerified) {
      await sendEvalScoutEmailVerification(user);
      return {
        ok: true,
        emailVerified: false,
        message: "Verification email sent.",
      };
    }

    return {
      ok: true,
      emailVerified: true,
      message: "Email is already verified.",
    };
  } catch (err) {
    throw mapFirebaseError(err);
  }
},

  me: async () => loadSession(),

  listSports: async () => listSportsFromDb(),

  getSport: async (id) => {
    const sports = await listSportsFromDb();
    const sport = sports.find((s) => s.id === id);
    if (!sport) throw new ApiError(404, "Sport not found", "NOT_FOUND");
    return sport;
  },

  getRankings: async (sportId) => {
    const user = requireUser();
    const playersSnap = await getDocs(
      query(collection(db, "players"), where("coachId", "==", user.uid)),
    );
    const evalsSnap = await getDocs(
      query(collection(db, "evaluations"), where("coachId", "==", user.uid), where("sportId", "==", sportId)),
    );
    const evalsByPlayer = new Map();
    evalsSnap.docs.forEach((d) => {
      const e = d.data();
      const list = evalsByPlayer.get(e.playerId) || [];
      list.push(e);
      evalsByPlayer.set(e.playerId, list);
    });
    const rankings = playersSnap.docs
      .map((d) => {
        const player = { id: d.id, ...d.data() };
        const evals = evalsByPlayer.get(d.id) || [];
        const averages = evals.map((e) => Number(e.overallScore) || overallFromScores(e.scores || {}));
        const averageScore = averages.length
          ? averages.reduce((a, b) => a + b, 0) / averages.length
          : 0;
        return {
          player,
          averageScore,
          evaluationCount: evals.length,
        };
      })
      .sort((a, b) => b.averageScore - a.averageScore)
      .map((row, index) => ({ ...row, rank: index + 1 }));
    const scores = rankings.map((r) => r.averageScore).filter((n) => n > 0).sort((a, b) => a - b);
    const median = scores.length
      ? scores.length % 2
        ? scores[(scores.length - 1) / 2]
        : (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
      : 0;
    return { sportId, median, rankings };
  },

  resetSportData: async (sportId) => {
    const user = requireUser();
    const batch = writeBatch(db);
    const [evals, customs] = await Promise.all([
      getDocs(query(collection(db, "evaluations"), where("coachId", "==", user.uid), where("sportId", "==", sportId))),
      getDocs(query(collection(db, "customSkills"), where("coachId", "==", user.uid), where("sportId", "==", sportId))),
    ]);
    evals.docs.forEach((d) => batch.delete(d.ref));
    customs.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, "hiddenSkills", `${user.uid}_${sportId}`));
    await batch.commit();
    return { ok: true };
  },

  listCustomSkills: async (sportId) => {
    const user = requireUser();
    const snap = await getDocs(
      query(collection(db, "customSkills"), where("coachId", "==", user.uid), where("sportId", "==", sportId)),
    );
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: data.skillId || data.id || d.id,
        label: data.label || "",
        symbol: data.symbol || "star.fill",
        hint: data.hint || "",
        scope: data.scope === "player" ? "player" : "all",
        playerId: data.playerId || "",
        custom: true,
      };
    });
  },

  saveCustomSkills: async (sportId, skills = []) => {
    const user = requireUser();
    const existing = await getDocs(
      query(collection(db, "customSkills"), where("coachId", "==", user.uid), where("sportId", "==", sportId)),
    );
    const batch = writeBatch(db);
    existing.docs.forEach((d) => batch.delete(d.ref));
    skills.forEach((skill) => {
      const id = `${user.uid}_${sportId}_${skill.id}`;
      batch.set(doc(db, "customSkills", id), {
        coachId: user.uid,
        sportId,
        skillId: skill.id,
        label: skill.label,
        symbol: skill.symbol || "star.fill",
        hint: skill.hint || "",
        scope: skill.scope === "player" ? "player" : "all",
        playerId: skill.scope === "player" ? skill.playerId || "" : "",
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
    return skills;
  },

  getHiddenSkills: async (sportId) => {
    const user = requireUser();
    const snap = await getDoc(doc(db, "hiddenSkills", `${user.uid}_${sportId}`));
    return new Set(snap.data()?.skillIds || []);
  },

  saveHiddenSkills: async (sportId, skillIds = []) => {
    const user = requireUser();
    await setDoc(
      doc(db, "hiddenSkills", `${user.uid}_${sportId}`),
      {
        coachId: user.uid,
        sportId,
        skillIds: [...skillIds],
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return [...skillIds];
  },

  listPlayers: async (params = {}) => {
    const user = requireUser();
    const snap = await getDocs(query(collection(db, "players"), where("coachId", "==", user.uid)));
    let players = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (params.search) {
      const s = params.search.toLowerCase();
      players = players.filter((p) => (p.name || "").toLowerCase().includes(s));
    }
    const evalsSnap = await getDocs(query(collection(db, "evaluations"), where("coachId", "==", user.uid)));
    const byPlayer = new Map();
    evalsSnap.docs.forEach((d) => {
      const e = { id: d.id, ...d.data() };
      if (params.sportId && e.sportId !== params.sportId) return;
      const list = byPlayer.get(e.playerId) || [];
      list.push(e);
      byPlayer.set(e.playerId, list);
    });
    return players.map((p) => ({
      ...p,
      evaluations: (byPlayer.get(p.id) || []).sort((a, b) => {
        const time = (e) => {
          const raw = e.date || e.updatedAt || e.createdAt;
          if (!raw) return 0;
          if (typeof raw.toDate === "function") return raw.toDate().getTime();
          if (typeof raw.seconds === "number") return raw.seconds * 1000;
          const t = new Date(raw).getTime();
          return Number.isNaN(t) ? 0 : t;
        };
        return time(b) - time(a);
      }),
    }));
  },

  createPlayer: async (body) => {
    const user = requireUser();
    const id = body.id || newId();
    const name = (body.name || `${body.firstName || ""} ${body.lastName || ""}`).trim();
    if (!name) throw new ApiError(400, "Player name is required", "VALIDATION_ERROR");
    const birthday = body.birthday || "";
    const payload = {
      coachId: user.uid,
      sportId: "",
      teamId: body.teamId || null,
      name,
      jerseyNumber: body.jerseyNumber || "",
      birthday,
      age: ageFromBirthday(birthday) || body.age || "",
      position: body.position || "",
      sportPositions: body.sportPositions || {},
      notes: body.notes || "",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, "players", id), payload);
    return { id, ...payload, evaluations: [] };
  },

  updatePlayer: async (id, body) => {
    const user = requireUser();
    const refDoc = doc(db, "players", id);
    const snap = await getDoc(refDoc);
    if (!snap.exists()) throw new ApiError(404, "Player not found", "NOT_FOUND");
    if (snap.data().coachId !== user.uid) throw new ApiError(403, "Forbidden", "FORBIDDEN");
    const name = body.name != null
      ? String(body.name).trim()
      : (body.firstName || body.lastName)
        ? `${body.firstName || ""} ${body.lastName || ""}`.trim()
        : snap.data().name;
    const birthday = body.birthday != null ? body.birthday : snap.data().birthday || "";
    const next = {
      ...snap.data(),
      ...body,
      name,
      birthday,
      age: ageFromBirthday(birthday) || body.age || snap.data().age || "",
      sportId: snap.data().sportId || "",
      sportPositions: body.sportPositions || snap.data().sportPositions || {},
      coachId: user.uid,
      updatedAt: serverTimestamp(),
    };
    await setDoc(refDoc, next, { merge: true });
    return { id, ...next };
  },

  deletePlayer: async (id) => {
    const user = requireUser();
    const refDoc = doc(db, "players", id);
    const snap = await getDoc(refDoc);
    if (!snap.exists()) return { ok: true };
    if (snap.data().coachId !== user.uid) throw new ApiError(403, "Forbidden", "FORBIDDEN");
    const evals = await getDocs(query(collection(db, "evaluations"), where("playerId", "==", id)));
    const batch = writeBatch(db);
    evals.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(refDoc);
    await batch.commit();
    return { ok: true };
  },

  listEvaluations: async (params = {}) => {
    const user = requireUser();
    let q = query(collection(db, "evaluations"), where("coachId", "==", user.uid));
    if (params.sportId) q = query(q, where("sportId", "==", params.sportId));
    if (params.playerId) q = query(q, where("playerId", "==", params.playerId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  createEvaluation: async (body) => {
    const user = requireUser();
    const id = body.id || newId();
    if (!body.playerId) throw new ApiError(400, "playerId is required", "VALIDATION_ERROR");
    const scores = body.scores || body.skillsJson || {};
    const payload = {
      coachId: user.uid,
      playerId: body.playerId,
      teamId: body.teamId || null,
      sportId: body.sportId || "",
      date: body.date || new Date().toISOString(),
      seasonName: body.seasonName || "",
      seasonYear: body.seasonYear || "",
      evaluationType: body.evaluationType || body.context || "PRACTICE",
      context: body.context || body.evaluationType || "PRACTICE",
      scores,
      skillNotes: body.skillNotes || {},
      notes: body.notes || body.comments || "",
      comments: body.comments || body.notes || "",
      overallScore: body.overallScore ?? overallFromScores(scores),
      skillsJson: typeof scores === "string" ? scores : JSON.stringify(scores),
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, "evaluations", id), payload);
    return { id, ...payload };
  },

  updateEvaluation: async (id, body) => {
    const user = requireUser();
    const refDoc = doc(db, "evaluations", id);
    const snap = await getDoc(refDoc);
    if (!snap.exists()) throw new ApiError(404, "Evaluation not found", "NOT_FOUND");
    if (snap.data().coachId !== user.uid) throw new ApiError(403, "Forbidden", "FORBIDDEN");
    const scores = body.scores || body.skillsJson || snap.data().scores || {};
    const next = {
      ...snap.data(),
      ...body,
      scores,
      overallScore: body.overallScore ?? overallFromScores(scores),
      coachId: user.uid,
      updatedAt: serverTimestamp(),
    };
    await setDoc(refDoc, next, { merge: true });
    return { id, ...next };
  },

  deleteEvaluation: async (id) => {
    const user = requireUser();
    const refDoc = doc(db, "evaluations", id);
    const snap = await getDoc(refDoc);
    if (!snap.exists()) return { ok: true };
    if (snap.data().coachId !== user.uid) throw new ApiError(403, "Forbidden", "FORBIDDEN");
    await deleteDoc(refDoc);
    return { ok: true };
  },

  getProfile: async () => {
    const session = await loadSession();
    return session.profile;
  },

  saveProfile: async (body) => {
    try {
      const user = requireUser();
      const refDoc = doc(db, "coachProfiles", user.uid);
      const current = (await getDoc(refDoc)).data() || {};
      const next = mapProfile(user.uid, {
        ...current,
        ...body,
        coachName: (body.coachName || body.displayName || current.coachName || "").trim(),
        coachEmail: (body.coachEmail || body.email || current.coachEmail || user.email || "").trim(),
        phoneNumber: String(
          body.phoneNumber !== undefined ? body.phoneNumber : current.phoneNumber || "",
        ).trim(),
        organizationName: String(
          body.organizationName !== undefined || body.orgName !== undefined
            ? body.organizationName || body.orgName || ""
            : current.organizationName || current.orgName || "",
        ).trim(),
        orgName: String(
          body.orgName !== undefined || body.organizationName !== undefined
            ? body.orgName || body.organizationName || ""
            : current.orgName || current.organizationName || "",
        ).trim(),
        teamName: String(
          body.teamName !== undefined ? body.teamName : current.teamName || "",
        ).trim(),
        teamIdentifier: String(
          body.teamIdentifier !== undefined ? body.teamIdentifier : current.teamIdentifier || "",
        ).trim(),
        sport: String(body.sport !== undefined ? body.sport : current.sport || "").trim(),
        role: normalizeCoachTitle(
          body.role !== undefined ? body.role : current.role || "Head Coach",
        ),
        logoUrl: body.logoUrl !== undefined ? body.logoUrl : current.logoUrl ?? null,
      });
      await setDoc(
        refDoc,
        {
          ...next,
          coachId: user.uid,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      return next;
    } catch (err) {
      throw mapFirebaseError(err);
    }
  },

  clearLogo: async () => {
    const user = requireUser();
    const profile = await api.getProfile();
    if (profile.logoUrl?.includes("firebasestorage")) {
      try {
        await deleteObject(ref(storage, `logos/${user.uid}/profile.jpg`));
      } catch {
        /* ignore missing */
      }
    }
    return api.saveProfile({ ...profile, logoUrl: null });
  },

  uploadLogo: (file, onProgress) =>
    new Promise((resolve, reject) => {
      try {
        const user = requireUser();
        const storageRef = ref(storage, `logos/${user.uid}/profile.jpg`);
        const task = uploadBytesResumable(storageRef, file, {
          contentType: file.type || "image/jpeg",
        });
        task.on(
          "state_changed",
          (snap) => {
            if (typeof onProgress === "function" && snap.totalBytes) {
              onProgress((snap.bytesTransferred / snap.totalBytes) * 100);
            }
          },
          (err) => reject(mapFirebaseError(err)),
          async () => {
            try {
              const url = await getDownloadURL(task.snapshot.ref);
              const profile = await api.saveProfile({ logoUrl: url });
              resolve({ url, purpose: "logo", ...profile });
            } catch (err) {
              reject(mapFirebaseError(err));
            }
          },
        );
      } catch (err) {
        reject(mapFirebaseError(err));
      }
    }),

  getSettings: async () => {
    const session = await loadSession();
    return session.settings;
  },

  saveSettings: async (body) => {
    try {
      const user = requireUser();
      const refDoc = doc(db, "userSettings", user.uid);
      const current = (await getDoc(refDoc)).data() || {};
      const next = {
        theme: body.theme || current.theme || "dark",
        reportLanguage: body.reportLanguage || current.reportLanguage || "english",
        defaultRosterSize: body.defaultRosterSize ?? current.defaultRosterSize ?? 18,
        notificationsEnabled: body.notificationsEnabled ?? current.notificationsEnabled ?? true,
        updatedAt: serverTimestamp(),
      };
      await setDoc(refDoc, next, { merge: true });
      return next;
    } catch (err) {
      throw mapFirebaseError(err);
    }
  },

  adminOverview: async () => {
    await requireAdminSession();
    const [usersSnap, playersSnap, evaluationsSnap] = await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "players")),
      getDocs(collection(db, "evaluations")),
    ]);
    const users = usersSnap.docs.map((d) => mapUser(d.id, d.data()));
    const admins = users.filter((u) => isAdminRole(u.role)).length;
    const coaches = users.length - admins;
    return {
      totals: {
        users: users.length,
        coaches,
        admins,
        players: playersSnap.size,
        evaluations: evaluationsSnap.size,
        teams: 0,
        sports: localSports.length,
      },
    };
  },

  adminListUsers: async (params = {}) => {
    await requireAdminSession();
    const snap = await getDocs(collection(db, "users"));
    let rows = await Promise.all(snap.docs.map((d) => enrichAdminUser(d.id, d.data())));
    const search = String(params.search || "")
      .trim()
      .toLowerCase();
    if (search) {
      rows = rows.filter((u) => {
        const hay = [
          u.email,
          u.profile?.coachName,
          u.profile?.organizationName,
          u.profile?.teamName,
          u.role,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(search);
      });
    }
    rows.sort((a, b) => String(a.email).localeCompare(String(b.email)));
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const data = rows.slice(start, start + limit);
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages,
      },
    };
  },

  adminGetUser: async (id) => {
    await requireAdminSession();
    const userSnap = await getDoc(doc(db, "users", id));
    if (!userSnap.exists()) throw new ApiError(404, "User not found", "NOT_FOUND");
    const enriched = await enrichAdminUser(id, userSnap.data());
    const [playersSnap, evaluationsSnap] = await Promise.all([
      getDocs(query(collection(db, "players"), where("coachId", "==", id), fsLimit(50))),
      getDocs(query(collection(db, "evaluations"), where("coachId", "==", id), fsLimit(50))),
    ]);
    return {
      ...enriched,
      teams: [],
      players: playersSnap.docs.map((d) => ({ id: d.id, ...d.data(), evaluations: [] })),
      evaluations: evaluationsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    };
  },

  adminUpdateAccountRole: async (id, role) => {
    const session = await requireAdminSession();
    const nextRole = normalizeAccountRole(role);
    if (!id) throw new ApiError(400, "User id is required", "VALIDATION_ERROR");
    if (id === session.user.id && nextRole !== ACCOUNT_ROLES.ADMIN) {
      throw new ApiError(400, "You cannot remove your own admin access.", "VALIDATION_ERROR");
    }
    const refDoc = doc(db, "users", id);
    const snap = await getDoc(refDoc);
    if (!snap.exists()) throw new ApiError(404, "User not found", "NOT_FOUND");
    const previousRole = normalizeAccountRole(snap.data().role);
    if (previousRole === nextRole) {
      return mapUser(id, snap.data());
    }
    await updateDoc(refDoc, { role: nextRole });
    await writeAuditLog({
      action: "account.role.update",
      targetUserId: id,
      meta: { previousRole, nextRole },
    });
    return mapUser(id, { ...snap.data(), role: nextRole });
  },

  sendReportEmail: async ({ to, subject, html, text, pdfBase64, filename }) => {
    const user = requireUser();
    const payload = { to, subject, html, text, pdfBase64, filename };
    const token = await user.getIdToken();

    const webOrigin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://evalscout.hasthiya.com";

    try {
      const cpanelRes = await fetch(`${webOrigin}/api/send-report.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const cpanelBody = await cpanelRes.json().catch(() => ({}));
      if (cpanelRes.ok) {
        return cpanelBody || { ok: true, method: "cpanel-mail" };
      }
      if (cpanelRes.status !== 404 && cpanelRes.status !== 502) {
        throw new ApiError(
          cpanelRes.status,
          cpanelBody.message || "Could not send the evaluation email via cPanel.",
          cpanelBody.error || "EMAIL_FAILED",
        );
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
      /* fall through to Firebase / legacy API */
    }

    try {
      const { getFunctions, httpsCallable } = await import("firebase/functions");
      const functions = getFunctions(firebaseApp);
      const call = httpsCallable(functions, "sendReportEmail", { timeout: 120000 });
      const { data } = await call(payload);
      return data || { ok: true };
    } catch (callableError) {
      const callableCode = callableError?.code || "";
      const shouldTryLegacyApi =
        callableCode === "functions/not-found" || callableCode === "functions/unavailable";

      if (!shouldTryLegacyApi) {
        throw new ApiError(
          500,
          callableError?.message || "Could not send the evaluation email.",
          "EMAIL_FAILED",
        );
      }
    }

    const base = String(import.meta.env.VITE_API_URL || "https://api.evalscout.hasthiya.com").replace(/\/$/, "");
    const res = await fetch(`${base}/api/reports/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiError(
        res.status,
        body.message || "Could not send the evaluation email.",
        body.error || "EMAIL_FAILED",
        body.details,
      );
    }
    return body;
  },

  adminAuditLogs: async () => {
    await requireAdminSession();
    const snap = await getDocs(
      query(collection(db, "auditLogs"), orderBy("createdAt", "desc"), fsLimit(50)),
    );
    return {
      data: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      meta: { page: 1, limit: 50, total: snap.size },
    };
  },
};

export function subscribeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}
