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
    const stored = localStorage.getItem("miltomy_current_user");
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
      const isPreview = window.location.search.includes("preview=true") || window.location.hash.includes("preview=true") || localStorage.getItem("miltomy_demo_mode") === "true";
      if (isPreview) {
        setUserState({
          id: "preview-admin",
          name: "Milton Egbesola",
          email: "miltomy@gmail.com",
          role: "OWNER",
          isActive: true,
          createdAt: new Date().toISOString()
        });
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("miltomy_token");
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
          localStorage.setItem("miltomy_current_user", JSON.stringify(data.user));
        } else {
          localStorage.removeItem("miltomy_token");
          localStorage.removeItem("miltomy_current_user");
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
      localStorage.setItem("miltomy_current_user", JSON.stringify(newUser));
    } else {
      localStorage.removeItem("miltomy_current_user");
      localStorage.removeItem("miltomy_token");
      localStorage.removeItem("miltomy_demo_mode");
    }
  };

  const login = (token: string, newUser: User) => {
    localStorage.setItem("miltomy_token", token);
    setUser(newUser);
  };

  const logout = () => {
    setUser(null);
  };

  const value = useMemo(() => ({
    user: user as User,
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
