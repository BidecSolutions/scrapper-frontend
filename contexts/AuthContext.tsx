"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: number;
  email: string;
  full_name: string | null;
  status: "pending" | "active" | "suspended";
  is_super_admin: boolean;
  can_use_advanced: boolean;
  organization_id: number | null;
  current_workspace_id: number | null;
  created_at: string;
  last_login_at: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, userInfo: User) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth is disabled in this project: always expose a default user.
  useEffect(() => {
    setToken(null);
    setUser({
      id: 1,
      email: "default@example.com",
      full_name: "Default User",
      status: "active",
      is_super_admin: true,
      can_use_advanced: true,
      organization_id: 1,
      current_workspace_id: 1,
      created_at: new Date().toISOString(),
      last_login_at: null,
    });
    setLoading(false);
  }, []);

  const login = async (authToken: string, userInfo: User) => {
    // Kept for compatibility with existing components (no-op for token).
    setToken(authToken || null);
    setUser(userInfo);
  };

  const logout = () => {
    // Auth disabled: keep user/session available.
    setToken(null);
  };

  const refreshUser = async () => {
    return;
  };

  const isSuperAdmin = user?.is_super_admin || false;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        refreshUser,
        isSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

