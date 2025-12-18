import React, { createContext, useContext, useMemo, useState } from "react";
import { api } from "../lib/api";
import { clearToken, clearUser, getToken, getUser, setToken, setUser } from "../lib/storage";

type User = { id: string; name: string; email: string; role: string };

type AuthState = {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [user, setUserState] = useState<User | null>(() => getUser<User>());

  const value = useMemo<AuthState>(
    () => ({
      token,
      user,
      login: async (email, password) => {
        const resp = await api.login(email, password);
        setToken(resp.token);
        setTokenState(resp.token);
        setUser(resp.user);
        setUserState(resp.user);
      },
      logout: () => {
        clearToken();
        clearUser();
        setTokenState(null);
        setUserState(null);
      },
    }),
    [token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}


