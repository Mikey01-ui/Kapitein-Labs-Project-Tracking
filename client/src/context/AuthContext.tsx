import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "../types";

interface AuthContextValue {
  user: User; // Type asserted as non-null for TS convenience since it is guarded by ProtectedRoute
  loading: boolean;
  setUser: (user: User | null) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => {
    // Attempt sync load from cache for fast initial paint
    const stored = localStorage.getItem("kapetein_current_user");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }
    return null;
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      const isPreview = window.location.search.includes("preview=true") || window.location.hash.includes("preview=true") || localStorage.getItem("kapetein_demo_mode") === "true";
      if (isPreview) {
        const demoUser: User = {
          id: "demo-user-milton",
          name: "Milton Employee (Demo)",
          email: "miltomy01@gmail.com",
          role: "EMPLOYEE",
          isActive: true,
          weeklyTargetHours: 40,
          createdAt: "2026-01-01T00:00:00.000Z"
        };
        localStorage.setItem("kapetein_demo_mode", "true");
        localStorage.setItem("kapetein_token", "demo-token-12345");
        setUserState(demoUser);
        localStorage.setItem("kapetein_current_user", JSON.stringify(demoUser));
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("kapetein_token");
      if (!token) {
        setUserState(null);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/auth/me", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setUserState(data.user);
          localStorage.setItem("kapetein_current_user", JSON.stringify(data.user));
        } else {
          // Token expired or invalid, purge session
          localStorage.removeItem("kapetein_token");
          localStorage.removeItem("kapetein_current_user");
          setUserState(null);
        }
      } catch (e) {
        console.warn("API Auth server check failed, using local fallback state", e);
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem("kapetein_current_user", JSON.stringify(newUser));
    } else {
      localStorage.removeItem("kapetein_current_user");
      localStorage.removeItem("kapetein_token");
      localStorage.removeItem("kapetein_demo_mode");
    }
  };

  const login = (token: string, newUser: User) => {
    localStorage.setItem("kapetein_token", token);
    setUser(newUser);
  };

  const logout = () => {
    setUser(null);
  };

  const value = useMemo(() => ({
    user: user as User, // Assert type as non-null
    loading,
    setUser,
    login,
    logout
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
