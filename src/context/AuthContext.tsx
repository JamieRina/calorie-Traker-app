import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  clearSession,
  getProfileSummary,
  hasStoredSession,
  loginWithEmail,
  logoutAccount,
  registerAccount,
  type GoalType,
  type StarterProfileInput,
} from "@/lib/api";

type SignUpInput = StarterProfileInput & {
  email: string;
  password: string;
};

interface AuthContextType {
  isAuthenticated: boolean;
  isAuthBusy: boolean;
  accountName: string | null;
  login: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const GOAL_OPTIONS: Array<{ value: GoalType; label: string; detail: string }> = [
  { value: "lose", label: "Lose weight", detail: "A gentle calorie deficit" },
  { value: "maintain", label: "Maintain", detail: "Hold steady and build habits" },
  { value: "gain", label: "Gain muscle", detail: "Fuel training and recovery" },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => hasStoredSession());
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [accountName, setAccountName] = useState<string | null>(null);

  const refreshAccountName = useCallback(async () => {
    try {
      const summary = await getProfileSummary();
      setAccountName(summary.profile.name);
    } catch {
      setAccountName(null);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsAuthBusy(true);
      try {
        await loginWithEmail(email, password);
        setIsAuthenticated(true);
        await refreshAccountName();
      } finally {
        setIsAuthBusy(false);
      }
    },
    [refreshAccountName],
  );

  const signUp = useCallback(
    async (input: SignUpInput) => {
      setIsAuthBusy(true);
      try {
        await registerAccount(input);
        setIsAuthenticated(true);
        setAccountName(input.displayName.trim());
      } finally {
        setIsAuthBusy(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    setIsAuthBusy(true);
    try {
      await logoutAccount();
    } catch {
      clearSession();
    } finally {
      setAccountName(null);
      setIsAuthenticated(false);
      setIsAuthBusy(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
      isAuthBusy,
      accountName,
      login,
      signUp,
      logout,
    }),
    [accountName, isAuthBusy, isAuthenticated, login, logout, signUp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
