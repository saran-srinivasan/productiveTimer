import React, { createContext, useContext, useEffect, useState } from "react";
import {
  checkAuthStatusApi,
  loginMasterPasswordApi,
  logoutApi,
  setupMasterPasswordApi,
} from "../apiClient";

interface AuthContextType {
  isAuthenticated: boolean;
  isSetup: boolean;
  role: string;
  isLoading: boolean;
  error: string | null;
  login: (password: string) => Promise<void>;
  setup: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSetup, setIsSetup] = useState(true);
  const [role, setRole] = useState("guest");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const status = await checkAuthStatusApi();
      setIsAuthenticated(status.authenticated);
      setIsSetup(status.is_setup);
      setRole(status.role);
    } catch {
      // Backend may be offline or unauthenticated
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (password: string) => {
    setError(null);
    try {
      const res = await loginMasterPasswordApi(password);
      setIsAuthenticated(true);
      setRole(res.role);
    } catch (err: any) {
      setError(err?.message || "Login failed");
      throw err;
    }
  };

  const setup = async (password: string) => {
    setError(null);
    try {
      const res = await setupMasterPasswordApi(password);
      setIsAuthenticated(true);
      setIsSetup(true);
      setRole(res.role);
    } catch (err: any) {
      setError(err?.message || "Setup failed");
      throw err;
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } finally {
      setIsAuthenticated(false);
      setRole("guest");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isSetup,
        role,
        isLoading,
        error,
        login,
        setup,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
