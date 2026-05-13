import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useState } from "react";
import { ExternalLink, Gauge, LogOut, Moon, SlidersHorizontal, Sun, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AppPage, PageHeader, SectionCard } from "@/components/app/AppPage";
import { Input } from "@/components/ui/input";
import { GOAL_OPTIONS, useAuth } from "@/context/AuthContext";
import { getProfileSummary, updateProfileSettings, type GoalType } from "@/lib/api";
import { useApp } from "@/context/AppContext";

const activityOptions = [
  { value: "sedentary", label: "Desk based" },
  { value: "light", label: "Light" },
  { value: "moderate", label: "Moderate" },
  { value: "active", label: "Active" },
  { value: "athlete", label: "Athlete" },
] as const;

function mapGoalLabelToType(goal?: string): GoalType {
  if (goal === "Gain muscle") {
    return "gain";
  }

  if (goal === "Maintain") {
    return "maintain";
  }

  return "lose";
}

function toPositiveNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export default function Settings() {
  const { uiMode, setUiMode, themeMode, resolvedTheme, setThemeMode, isBackendReady } = useApp();
  const { logout, deleteAccount, isAuthBusy, accountName } = useAuth();
  const queryClient = useQueryClient();
  const [deletePassword, setDeletePassword] = useState("");
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    age: "30",
    heightCm: "175",
    currentWeightKg: "80",
    targetWeightKg: "75",
    activityLevel: "moderate",
    goalType: "lose" as GoalType,
  });
  const privacyPolicyUrl = import.meta.env.VITE_PRIVACY_POLICY_URL ?? "/privacy.html";

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: getProfileSummary,
    enabled: isBackendReady,
  });

  const profile = profileQuery.data?.profile;
  const goal = profileQuery.data?.dailyGoal;

  useEffect(() => {
    if (!profile) {
      return;
    }

    setProfileForm({
      displayName: profile.name,
      age: String(profile.age),
      heightCm: String(profile.heightCm),
      currentWeightKg: String(profile.currentWeight),
      targetWeightKg: String(profile.targetWeight),
      activityLevel: profile.activityLevel,
      goalType: mapGoalLabelToType(profile.goal),
    });
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: () =>
      updateProfileSettings({
        displayName: profileForm.displayName,
        age: toPositiveNumber(profileForm.age, 30),
        heightCm: toPositiveNumber(profileForm.heightCm, 175),
        currentWeightKg: toPositiveNumber(profileForm.currentWeightKg, 80),
        targetWeightKg: toPositiveNumber(profileForm.targetWeightKg, 75),
        activityLevel: profileForm.activityLevel as "sedentary" | "light" | "moderate" | "active" | "athlete",
        goalType: profileForm.goalType,
      }),
    onSuccess: (summary) => {
      queryClient.setQueryData(["profile"], summary);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Profile updated.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update your profile.");
    },
  });

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (profileForm.displayName.trim().length < 2) {
      toast.error("Name must be at least 2 characters.");
      return;
    }

    updateProfileMutation.mutate();
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error("Enter your password to delete your account.");
      return;
    }

    const confirmed = window.confirm("Delete your account and nutrition data permanently?");
    if (!confirmed) {
      return;
    }

    try {
      await deleteAccount(deletePassword);
      setDeletePassword("");
      toast.success("Account deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete your account.");
    }
  };

  return (
    <AppPage>
      <PageHeader
        eyebrow="Settings"
        title="Settings"
        action={
          <button
            onClick={logout}
            disabled={isAuthBusy}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/80 bg-card/90 text-foreground shadow-[var(--shadow-card)] disabled:opacity-50"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        }
      />

      <SectionCard variant="hero" eyebrow="Display" title={`${uiMode === "advanced" ? "Advanced" : "Simple"} / ${resolvedTheme === "dark" ? "Dark" : "Light"}`}>
        <div className="space-y-3">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Mode</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { mode: "simple" as const, title: "Simple", icon: SlidersHorizontal },
                { mode: "advanced" as const, title: "Advanced", icon: Gauge },
              ].map((option) => (
                <button
                  key={option.mode}
                  onClick={() => setUiMode(option.mode)}
                  className={`flex h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-semibold transition-all ${
                    uiMode === option.mode
                      ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-button)]"
                      : "border-border/75 bg-card/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <option.icon className="h-4 w-4" />
                  {option.title}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Theme</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { mode: "dark" as const, title: "Dark", icon: Moon },
                { mode: "light" as const, title: "Light", icon: Sun },
              ].map((option) => (
                <button
                  key={option.mode}
                  onClick={() => setThemeMode(option.mode)}
                  className={`flex h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-semibold transition-all ${
                    themeMode === option.mode
                      ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-button)]"
                      : "border-border/75 bg-card/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <option.icon className="h-4 w-4" />
                  {option.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {profile ? (
        <SectionCard
          eyebrow="Account"
          title={profile.name || accountName || "Your account"}
          description={`${profile.goal} / ${profile.currentWeight.toFixed(1)} kg`}
          action={
            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-secondary/50 text-primary">
              <UserRound className="h-6 w-6" />
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] bg-secondary/35 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/60">Daily goal</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{goal?.calories ?? 2200} kcal</p>
            </div>
            <div className="rounded-[22px] bg-secondary/35 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/60">Target weight</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{profile.targetWeight.toFixed(1)} kg</p>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {uiMode === "advanced" && profile ? (
        <SectionCard eyebrow="Advanced" title="Targets">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              `Protein target: ${goal?.protein ?? 150} g`,
              `Carb target: ${goal?.carbs ?? 220} g`,
              `Fat target: ${goal?.fat ?? 70} g`,
              `Fibre target: ${goal?.fiber ?? 30} g`,
            ].map((item) => (
              <div key={item} className="rounded-[22px] border border-border/80 bg-surface-elevated/35 px-4 py-3 text-sm font-medium text-foreground">
                {item}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.preferences.map((preference) => (
              <span key={preference} className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-foreground">
                {preference}
              </span>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {profile ? (
        <SectionCard eyebrow="Profile" title="Goals and body data">
          <form onSubmit={handleProfileSubmit} className="space-y-3">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Name</span>
              <Input
                value={profileForm.displayName}
                onChange={(event) => setProfileForm((current) => ({ ...current, displayName: event.target.value }))}
                className="h-12 border-border/80 bg-surface-elevated/80"
                autoComplete="name"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Age</span>
                <Input
                  value={profileForm.age}
                  onChange={(event) => setProfileForm((current) => ({ ...current, age: event.target.value }))}
                  inputMode="numeric"
                  className="h-12 border-border/80 bg-surface-elevated/80"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Height cm</span>
                <Input
                  value={profileForm.heightCm}
                  onChange={(event) => setProfileForm((current) => ({ ...current, heightCm: event.target.value }))}
                  inputMode="decimal"
                  className="h-12 border-border/80 bg-surface-elevated/80"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Current kg</span>
                <Input
                  value={profileForm.currentWeightKg}
                  onChange={(event) => setProfileForm((current) => ({ ...current, currentWeightKg: event.target.value }))}
                  inputMode="decimal"
                  className="h-12 border-border/80 bg-surface-elevated/80"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Target kg</span>
                <Input
                  value={profileForm.targetWeightKg}
                  onChange={(event) => setProfileForm((current) => ({ ...current, targetWeightKg: event.target.value }))}
                  inputMode="decimal"
                  className="h-12 border-border/80 bg-surface-elevated/80"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Activity</span>
              <select
                value={profileForm.activityLevel}
                onChange={(event) => setProfileForm((current) => ({ ...current, activityLevel: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-input bg-surface-elevated/80 px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {activityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-2">
              {GOAL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setProfileForm((current) => ({ ...current, goalType: option.value }))}
                  className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    profileForm.goalType === option.value
                      ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-button)]"
                      : "border-border/80 bg-surface-elevated/60 text-foreground"
                  }`}
                >
                  <span className="font-semibold">{option.label}</span>
                  <span className="mt-1 block text-xs opacity-80">{option.detail}</span>
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-button)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              Save profile
            </button>
          </form>
        </SectionCard>
      ) : null}

      <SectionCard eyebrow="Privacy" title="Privacy policy">
        <a
          href={privacyPolicyUrl}
          target="_blank"
          rel="noreferrer"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border/80 bg-card/75 text-sm font-semibold text-foreground"
        >
          Open privacy policy
          <ExternalLink className="h-4 w-4" />
        </a>
      </SectionCard>

      <SectionCard eyebrow="Account" title="Delete account">
        <div className="space-y-3">
          <Input
            type="password"
            value={deletePassword}
            onChange={(event) => setDeletePassword(event.target.value)}
            placeholder="Current password"
            autoComplete="current-password"
            className="h-12 border-border/80 bg-surface-elevated/80"
          />
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={isAuthBusy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 text-sm font-semibold text-destructive disabled:cursor-not-allowed disabled:opacity-55"
          >
            <Trash2 className="h-4 w-4" />
            Delete account
          </button>
        </div>
      </SectionCard>
    </AppPage>
  );
}
