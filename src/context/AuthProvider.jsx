
import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";

import { api, subscribeAuth } from "../lib/api";
import { auth } from "../lib/firebase";
import {
  clearAuthSession,
  setRememberedEmail,
} from "../lib/auth-storage";
import {
  ACCOUNT_ROLES,
  isAdminRole,
} from "../lib/roles";
import { AuthContext } from "./AuthContext";

function normalizeUser(payload) {
  if (!payload) return null;

  if (payload.user && typeof payload.user === "object") {
    return {
      ...payload.user,
      email: payload.user.email ?? payload.email,
      profile: payload.profile ?? payload.user.profile,
      settings: payload.settings ?? payload.user.settings,
    };
  }

  return payload;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(normalizeUser(me));
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const unsub = subscribeAuth(async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        clearAuthSession();
        setLoading(false);
        return;
      }

      try {
        const me = await api.me();
        const normalized = normalizeUser(me);

        setUser(normalized);

        if (normalized?.email) {
          setRememberedEmail(normalized.email);
        }
      } catch {
        if (!firebaseUser.emailVerified) {
          setUser(null);

          // Correct Firebase sign out
          await signOut(auth);
        } else {
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            role: ACCOUNT_ROLES.USER,
            isEmailVerified: firebaseUser.emailVerified,
          });
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const login = useCallback(
    async (email, password, options = {}) => {
      const data = await api.login({
        email,
        password,
      });

      const normalized = normalizeUser(data);

      console.log(
        "Logged in user role:",
        normalized?.role
      );

      if (
        options.rememberMe !== false &&
        normalized?.email
      ) {
        setRememberedEmail(normalized.email);
      }

      setUser(normalized);

      return normalized;
    },
    []
  );

  const register = useCallback(
    async (email, password, coachName, role) => {
      const data = await api.register({
        email,
        password,
        coachName,
        role,
      });

      const normalized = normalizeUser(data);

      if (normalized?.email) {
        setRememberedEmail(normalized.email);
      }

      setUser(normalized);

      return normalized;
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      clearAuthSession();
      setUser(null);
    }
  }, []);

  const isAdmin = isAdminRole(user?.role);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin,
      login,
      register,
      logout,
      refreshUser,
    }),
    [
      user,
      loading,
      isAdmin,
      login,
      register,
      logout,
      refreshUser,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
