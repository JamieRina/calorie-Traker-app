import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  confirmPasswordReset,
  clearSession,
  deleteAccount as deleteAccountRequest,
  getProfileSummary,
  hasStoredSession,
  loginWithEmail,
  logoutAccount,
  registerAccount,
  requestPasswordReset,
  resendSignupVerification,
  restoreSession,
  saveStarterProfile,
  type GoalType,
  type StarterProfileInput,
  verifySignupCode,
} from "@/lib/api";

type SignUpInput = StarterProfileInput & {
  email: string;
  password: string;
};

type PendingSignupProfile = StarterProfileInput & {
  email: string;
};

interface AuthContextType {
  isAuthenticated: boolean;
  isAuthBusy: boolean;
  accountName: string | null;
  login: (email: string, password: string) => Promise<void>;
  pendingSignupEmail: string | null;
  signUp: (input: SignUpInput) => Promise<{ email: string; expiresInMinutes: number }>;
  verifySignUp: (email: string, code: string) => Promise<void>;
  resendSignUpCode: (email: string) => Promise<number>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<string | null>;
  resetPassword: (token: string, password: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PENDING_SIGNUP_STORAGE_KEY = "bitebalance-pending-signup";

function readPendingSignupProfile() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(PENDING_SIGNUP_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PendingSignupProfile;
  } catch {
    window.sessionStorage.removeItem(PENDING_SIGNUP_STORAGE_KEY);
    return null;
  }
}

function writePendingSignupProfile(profile: PendingSignupProfile) {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(PENDING_SIGNUP_STORAGE_KEY, JSON.stringify(profile));
  }
}

function clearPendingSignupProfile() {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(PENDING_SIGNUP_STORAGE_KEY);
  }
}

export const GOAL_OPTIONS: Array<{ value: GoalType; label: string; detail: string }> = [
  { value: "lose", label: "Lose weight", detail: "A gentle calorie deficit" },
  { value: "maintain", label: "Maintain", detail: "Hold steady and build habits" },
  { value: "gain", label: "Gain muscle", detail: "Fuel training and recovery" },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => hasStoredSession());
  const [isAuthBusy, setIsAuthBusy] = useState(true);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [pendingSignup, setPendingSignup] = useState<PendingSignupProfile | null>(() => readPendingSignupProfile());

  const refreshAccountName = useCallback(async () => {
    const summary = await getProfileSummary();
    setAccountName(summary.profile.name);
  }, []);

  useEffect(() => {
    let isActive = true;

    const restoreExistingSession = async () => {
      setIsAuthBusy(true);

      try {
        if (!hasStoredSession()) {
          await restoreSession();
        }

        if (!isActive) {
          return;
        }

        setIsAuthenticated(true);
        await refreshAccountName();
      } catch {
        clearSession();
        if (isActive) {
          setAccountName(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (isActive) {
          setIsAuthBusy(false);
        }
      }
    };

    restoreExistingSession();

    return () => {
      isActive = false;
    };
  }, [refreshAccountName]);

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
        const result = await registerAccount(input);
        const pendingProfile: PendingSignupProfile = {
          displayName: input.displayName.trim(),
          email: result.email,
          age: input.age,
          heightCm: input.heightCm,
          currentWeightKg: input.currentWeightKg,
          targetWeightKg: input.targetWeightKg,
          goalType: input.goalType,
          activityLevel: input.activityLevel,
        };

        writePendingSignupProfile(pendingProfile);
        setPendingSignup(pendingProfile);
        setIsAuthenticated(false);
        setAccountName(null);
        return {
          email: result.email,
          expiresInMinutes: result.expiresInMinutes,
        };
      } finally {
        setIsAuthBusy(false);
      }
    },
    [],
  );

  const verifySignUp = useCallback(
    async (email: string, code: string) => {
      setIsAuthBusy(true);
      try {
        await verifySignupCode(email, code);
        const normalizedEmail = email.trim().toLowerCase();
        const starterProfile =
          pendingSignup?.email === normalizedEmail ? pendingSignup : readPendingSignupProfile();

        if (starterProfile?.email === normalizedEmail) {
          await saveStarterProfile(starterProfile);
        }

        clearPendingSignupProfile();
        setPendingSignup(null);
        setIsAuthenticated(true);
        if (starterProfile?.displayName) {
          setAccountName(starterProfile.displayName.trim());
        } else {
          await refreshAccountName();
        }
      } finally {
        setIsAuthBusy(false);
      }
    },
    [pendingSignup, refreshAccountName],
  );

  const resendSignUpCode = useCallback(async (email: string) => {
    const result = await resendSignupVerification(email);
    return result.expiresInMinutes;
  }, []);

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

  const sendPasswordReset = useCallback(async (email: string) => {
    const result = await requestPasswordReset(email);
    return result.debugResetToken ?? null;
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    setIsAuthBusy(true);
    try {
      await confirmPasswordReset(token, password);
      clearSession();
      setAccountName(null);
      setIsAuthenticated(false);
    } finally {
      setIsAuthBusy(false);
    }
  }, []);

  const deleteAccount = useCallback(async (password: string) => {
    setIsAuthBusy(true);
    try {
      await deleteAccountRequest(password);
      clearSession();
      setAccountName(null);
      setIsAuthenticated(false);
    } finally {
      setIsAuthBusy(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
      isAuthBusy,
      accountName,
      pendingSignupEmail: pendingSignup?.email ?? null,
      login,
      signUp,
      verifySignUp,
      resendSignUpCode,
      logout,
      sendPasswordReset,
      resetPassword,
      deleteAccount,
    }),
    [
      accountName,
      deleteAccount,
      isAuthBusy,
      isAuthenticated,
      login,
      logout,
      pendingSignup?.email,
      resendSignUpCode,
      resetPassword,
      sendPasswordReset,
      signUp,
      verifySignUp,
    ],
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
