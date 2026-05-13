import { FormEvent, useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, LockKeyhole, Mail, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import AppLogo from "@/components/AppLogo";
import { SectionCard } from "@/components/app/AppPage";
import { Input } from "@/components/ui/input";
import { GOAL_OPTIONS, useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import type { GoalType } from "@/lib/api";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "signup" | "verify" | "forgot" | "reset";

const activityOptions = [
  { value: "sedentary", label: "Desk based" },
  { value: "light", label: "Light" },
  { value: "moderate", label: "Moderate" },
  { value: "active", label: "Active" },
  { value: "athlete", label: "Athlete" },
] as const;

type ActivityLevel = (typeof activityOptions)[number]["value"];

type AuthFormState = {
  displayName: string;
  email: string;
  password: string;
  age: string;
  heightCm: string;
  currentWeightKg: string;
  targetWeightKg: string;
  goalType: GoalType;
  activityLevel: ActivityLevel;
};

const defaultForm: AuthFormState = {
  displayName: "",
  email: "",
  password: "",
  age: "30",
  heightCm: "175",
  currentWeightKg: "80",
  targetWeightKg: "75",
  goalType: "lose" as const,
  activityLevel: "moderate" as const,
};

function toPositiveNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getPasswordIssue(password: string) {
  if (password.length < 8) {
    return "Use a password with at least 8 characters.";
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Use at least one uppercase letter, one lowercase letter, and one number.";
  }

  return null;
}

function isInRange(value: string, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max;
}

export default function Auth() {
  const { login, signUp, verifySignUp, resendSignUpCode, sendPasswordReset, resetPassword, isAuthBusy, pendingSignupEmail } = useAuth();
  const { isBackendReady, isBootstrapping, retryBackendConnection } = useApp();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState(defaultForm);
  const [resetToken, setResetToken] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const headline =
    mode === "login"
      ? "Welcome back"
      : mode === "signup"
        ? "Create your account"
        : mode === "verify"
          ? "Verify your email"
          : mode === "forgot"
            ? "Reset password"
            : "Choose new password";
  const canSubmit = isBackendReady && !isAuthBusy;

  const selectedGoal = useMemo(
    () => GOAL_OPTIONS.find((goal) => goal.value === form.goalType) ?? GOAL_OPTIONS[0],
    [form.goalType],
  );

  function updateField<Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  useEffect(() => {
    const token = searchParams.get("resetToken");
    if (token) {
      setResetToken(token);
      setMode("reset");
    }
  }, [searchParams]);

  useEffect(() => {
    if (pendingSignupEmail && mode === "login") {
      setForm((current) => ({ ...current, email: pendingSignupEmail }));
      setMode("verify");
    }
  }, [mode, pendingSignupEmail]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isBackendReady) {
      setError("The app is still getting ready. Please try again in a moment.");
      return;
    }

    if ((mode === "login" || mode === "signup" || mode === "verify" || mode === "forgot") && !form.email.includes("@")) {
      setError("Use a valid email address.");
      return;
    }

    if (mode === "login" && !form.password) {
      setError("Enter your password.");
      return;
    }

    if (mode === "signup" || mode === "reset") {
      const passwordIssue = getPasswordIssue(form.password);
      if (passwordIssue) {
        setError(passwordIssue);
        return;
      }
    }

    if (mode === "signup") {
      if (!isInRange(form.age, 13, 100)) {
        setError("Enter an age between 13 and 100.");
        return;
      }

      if (!isInRange(form.heightCm, 80, 250)) {
        setError("Enter a height between 80 cm and 250 cm.");
        return;
      }

      if (!isInRange(form.currentWeightKg, 25, 350) || !isInRange(form.targetWeightKg, 25, 350)) {
        setError("Enter current and target weights between 25 kg and 350 kg.");
        return;
      }
    }

    try {
      if (mode === "forgot") {
        const debugToken = await sendPasswordReset(form.email);
        if (debugToken) {
          setResetToken(debugToken);
          setMode("reset");
        }
        toast.success(debugToken ? "Reset token generated for local testing." : "Check your email for a reset link.");
        return;
      }

      if (mode === "reset") {
        if (resetToken.trim().length < 32) {
          setError("Enter the reset token from your email.");
          return;
        }

        await resetPassword(resetToken, form.password);
        setForm((current) => ({ ...current, password: "" }));
        setResetToken("");
        setMode("login");
        toast.success("Password updated. Log in with your new password.");
        return;
      }

      if (mode === "login") {
        await login(form.email, form.password);
        toast.success("Logged in.");
        return;
      }

      if (mode === "verify") {
        if (!/^\d{6}$/.test(verificationCode.trim())) {
          setError("Enter the 6-digit code from your email.");
          return;
        }

        await verifySignUp(form.email, verificationCode);
        setVerificationCode("");
        toast.success("Email verified. Welcome in.");
        return;
      }

      if (form.displayName.trim().length < 2) {
        setError("Add your name so your profile can be created.");
        return;
      }

      const result = await signUp({
        displayName: form.displayName,
        email: form.email,
        password: form.password,
        age: toPositiveNumber(form.age, 30),
        heightCm: toPositiveNumber(form.heightCm, 175),
        currentWeightKg: toPositiveNumber(form.currentWeightKg, 80),
        targetWeightKg: toPositiveNumber(form.targetWeightKg, 75),
        goalType: form.goalType,
        activityLevel: form.activityLevel,
      });
      setForm((current) => ({ ...current, email: result.email, password: "" }));
      setVerificationCode("");
      setMode("verify");
      toast.success(`Check your email for a code. It expires in ${result.expiresInMinutes} minutes.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong. Please try again.");
    }
  }

  async function handleResendVerification() {
    setError(null);

    if (!form.email.includes("@")) {
      setError("Use a valid email address before requesting a new code.");
      return;
    }

    try {
      const expiresInMinutes = await resendSignUpCode(form.email);
      toast.success(`New code sent. It expires in ${expiresInMinutes} minutes.`);
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : "Could not resend the code yet.");
    }
  }

  return (
    <div className="relative flex h-full flex-col overflow-y-auto px-5 pb-7 pt-7 no-scrollbar safe-top">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_34%),radial-gradient(circle_at_top_right,hsl(var(--hydration)/0.14),transparent_42%)]" />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <AppLogo />
          <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-card/90 px-3 py-2 text-xs font-semibold text-primary shadow-[var(--shadow-card)]">
            <ShieldCheck className="h-4 w-4" />
            Secure
          </div>
        </div>

        <SectionCard variant="hero" eyebrow="BiteBalance" title={headline} description="Fast meal logging, clear goals, and progress that stays easy to read.">
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-surface-elevated/55 p-1">
            {[
              { value: "login" as const, label: "Log in" },
              { value: "signup" as const, label: "Sign up" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setMode(option.value);
                  setError(null);
                }}
                className={cn(
                  "rounded-md px-3 py-2.5 text-sm font-semibold transition-colors",
                  mode === option.value ? "bg-primary text-primary-foreground shadow-[var(--shadow-button)]" : "text-muted-foreground hover:bg-card hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            {mode === "signup" ? (
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Name</span>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={form.displayName}
                    onChange={(event) => updateField("displayName", event.target.value)}
                    className="h-12 border-border/80 bg-surface-elevated/80 pl-10"
                    placeholder="Jamie"
                    autoComplete="name"
                  />
                </div>
              </label>
            ) : null}

            {mode !== "reset" ? (
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    className="h-12 border-border/80 bg-surface-elevated/80 pl-10"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
              </label>
            ) : null}

            {mode === "verify" ? (
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Verification code</span>
                <div className="relative">
                  <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-12 border-border/80 bg-surface-elevated/80 pl-10 text-center text-lg font-bold tracking-[0.22em]"
                    placeholder="000000"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                  />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Enter the 6-digit code we emailed. Your account stays locked until this step is complete.
                </p>
              </label>
            ) : null}

            {mode === "reset" ? (
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Reset token</span>
                <div className="relative">
                  <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={resetToken}
                    onChange={(event) => setResetToken(event.target.value)}
                    className="h-12 border-border/80 bg-surface-elevated/80 pl-10"
                    placeholder="Paste token from email"
                    autoComplete="one-time-code"
                  />
                </div>
              </label>
            ) : null}

            {mode === "login" || mode === "signup" || mode === "reset" ? (
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Password</span>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(event) => updateField("password", event.target.value)}
                    className="h-12 border-border/80 bg-surface-elevated/80 pl-10"
                    placeholder="8+ chars, Aa, 123"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                </div>
              </label>
            ) : null}

            {mode === "signup" ? (
              <div className="space-y-3 rounded-[22px] border border-border/75 bg-card/60 p-3">
                <div className="grid grid-cols-3 gap-2">
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">Age</span>
                    <Input
                      inputMode="numeric"
                      value={form.age}
                      onChange={(event) => updateField("age", event.target.value)}
                      className="h-11 rounded-xl bg-surface-elevated/80"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">Height</span>
                    <Input
                      inputMode="decimal"
                      value={form.heightCm}
                      onChange={(event) => updateField("heightCm", event.target.value)}
                      className="h-11 rounded-xl bg-surface-elevated/80"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">Weight</span>
                    <Input
                      inputMode="decimal"
                      value={form.currentWeightKg}
                      onChange={(event) => updateField("currentWeightKg", event.target.value)}
                      className="h-11 rounded-xl bg-surface-elevated/80"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">Target kg</span>
                    <Input
                      inputMode="decimal"
                      value={form.targetWeightKg}
                      onChange={(event) => updateField("targetWeightKg", event.target.value)}
                      className="h-11 rounded-xl bg-surface-elevated/80"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">Activity</span>
                    <select
                      value={form.activityLevel}
                      onChange={(event) => updateField("activityLevel", event.target.value as typeof form.activityLevel)}
                      className="h-11 w-full rounded-xl border border-input bg-surface-elevated/80 px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {activityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-2">
                  {GOAL_OPTIONS.map((goal) => (
                    <button
                      key={goal.value}
                      type="button"
                      onClick={() => updateField("goalType", goal.value)}
                      className={cn(
                        "rounded-md border px-3 py-2 text-left transition-colors",
                        form.goalType === goal.value ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-button)]" : "border-border/80 bg-surface-elevated/60 text-foreground hover:border-primary/35",
                      )}
                    >
                      <span className="block text-sm font-semibold">{goal.label}</span>
                      <span className={cn("mt-1 block text-xs", form.goalType === goal.value ? "text-primary-foreground/80" : "text-muted-foreground")}>
                        {goal.detail}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? <div className="rounded-2xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}

            {!isBackendReady ? (
              <div className="rounded-2xl border border-carbs/30 bg-carbs/10 px-3 py-3 text-sm text-foreground">
                <div className="flex items-start gap-2">
                  <Activity className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">{isBootstrapping ? "Getting things ready..." : "Still preparing"}</p>
                    <p className="mt-1">The app is getting your account tools ready.</p>
                    {!isBootstrapping ? (
                      <button type="button" onClick={retryBackendConnection} className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-carbs">
                        Try again
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-button)] transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {mode === "login"
                ? "Log in"
                : mode === "signup"
                  ? `Start ${selectedGoal.label.toLowerCase()}`
                  : mode === "verify"
                    ? "Verify account"
                    : mode === "forgot"
                      ? "Send reset link"
                      : "Update password"}
              <ArrowRight className="h-4 w-4" />
            </button>

            {mode === "verify" ? (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={!canSubmit}
                className="flex w-full items-center justify-center gap-2 py-2 text-center text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-55"
              >
                <RefreshCw className="h-4 w-4" />
                Resend code
              </button>
            ) : null}

            {mode === "login" ? (
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                }}
                className="w-full py-2 text-center text-sm font-semibold text-primary"
              >
                Forgot password?
              </button>
            ) : null}

            {mode === "forgot" || mode === "reset" || mode === "verify" ? (
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className="w-full py-2 text-center text-sm font-semibold text-primary"
              >
                Back to login
              </button>
            ) : null}
          </form>
        </SectionCard>
      </div>
    </div>
  );
}
