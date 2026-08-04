import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { apiFetch, setAccessToken } from "../../lib/apiClient";
import type { AuthResponse, UserResponse } from "./types";

interface AuthContextValue {
  user: UserResponse | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // On load there's no access token in memory yet (it never survives a
    // refresh, by design - see docs/adr/0001), so the only way to know if
    // there's a live session is to try the httpOnly refresh cookie once.
    apiFetch<AuthResponse>("/api/auth/refresh", { method: "POST" })
      .then((response) => {
        setAccessToken(response.accessToken);
        setUser(response.user);
      })
      .catch(() => {
        setAccessToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const response = await apiFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAccessToken(response.accessToken);
    setUser(response.user);
  }

  async function signup(email: string, password: string, displayName: string) {
    const response = await apiFetch<AuthResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName }),
    });
    setAccessToken(response.accessToken);
    setUser(response.user);
  }

  async function logout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
