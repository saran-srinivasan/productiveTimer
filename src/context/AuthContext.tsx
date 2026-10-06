import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  checkAuthStatusApi,
  getAuthToken,
  loginMasterPasswordApi,
  logoutApi,
  setAuthToken,
  setupMasterPasswordApi,
} from "../apiClient";

export type UserRole = "owner" | "guest";
export type AuthModalMode = "setup" | "login";

interface AuthContextValue {
  role: UserRole;
  isSetup: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: (password: string) => Promise<{ success: boolean; error?: string }>;
  setup: (password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  enterGuestMode: () => void;
  isAuthModalOpen: boolean;
  authModalMode: AuthModalMode;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  guestResetCounter: number;
  resetGuestSandbox: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>("guest");
  const [isSetup, setIsSetup] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [token, setTokenState] = useState<string | null>(getAuthToken());

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>("login");
  const [guestResetCounter, setGuestResetCounter] = useState<number>(0);

  const openAuthModal = useCallback((mode: AuthModalMode = "login") => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  // Check auth status on load
  useEffect(() => {
    let cancelled = false;

    const verifyStatus = async () => {
      try {
        const currentToken = getAuthToken();
        const status = await checkAuthStatusApi(currentToken);

        if (cancelled) return;

        setIsSetup(status.is_setup);

        if (!status.is_setup) {
          // Master password not configured yet -> prompt setup
          setRole("guest");
          setIsAuthenticated(false);
          setAuthToken(null);
          setTokenState(null);
          setAuthModalMode("setup");
          setIsAuthModalOpen(true);
        } else if (status.authenticated) {
          // Token is valid and owner authenticated
          setRole("owner");
          setIsAuthenticated(true);
        } else {
          // Not authenticated -> guest mode
          setRole("guest");
          setIsAuthenticated(false);
          setAuthToken(null);
          setTokenState(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("Could not verify auth status with backend:", err);
          // Fallback to guest mode
          setRole("guest");
          setIsAuthenticated(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    verifyStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await loginMasterPasswordApi(password);
      setAuthToken(res.token);
      setTokenState(res.token);
      setRole("owner");
      setIsAuthenticated(true);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || "Invalid master password";
      return { success: false, error: msg };
    }
  };

  const setup = async (password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await setupMasterPasswordApi(password);
      setAuthToken(res.token);
      setTokenState(res.token);
      setIsSetup(true);
      setRole("owner");
      setIsAuthenticated(true);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || "Master key configuration failed";
      return { success: false, error: msg };
    }
  };

  const logout = async (): Promise<void> => {
    const currentToken = token ?? getAuthToken();
    setAuthToken(null);
    setTokenState(null);
    setRole("guest");
    setIsAuthenticated(false);
    if (currentToken) {
      await logoutApi(currentToken);
    }
  };

  const enterGuestMode = useCallback(() => {
    setRole("guest");
    setIsAuthenticated(false);
    setIsAuthModalOpen(false);
  }, []);

  const resetGuestSandbox = useCallback(() => {
    setGuestResetCounter((c) => c + 1);
  }, []);

  const value: AuthContextValue = {
    role,
    isSetup,
    isAuthenticated,
    isLoading,
    token,
    login,
    setup,
    logout,
    enterGuestMode,
    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    guestResetCounter,
    resetGuestSandbox,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
