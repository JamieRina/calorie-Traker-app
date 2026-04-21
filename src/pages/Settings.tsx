import { useQuery } from "@tanstack/react-query";
import { Gauge, LogOut, Moon, SlidersHorizontal, Sun, UserRound } from "lucide-react";
import { AppPage, PageHeader, SectionCard } from "@/components/app/AppPage";
import { useAuth } from "@/context/AuthContext";
import { getProfileSummary } from "@/lib/api";
import { useApp } from "@/context/AppContext";

export default function Settings() {
  const { uiMode, setUiMode, themeMode, resolvedTheme, setThemeMode, isBackendReady } = useApp();
  const { logout, isAuthBusy, accountName } = useAuth();

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: getProfileSummary,
    enabled: isBackendReady,
  });

  const profile = profileQuery.data?.profile;
  const goal = profileQuery.data?.dailyGoal;

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
          title={accountName ?? profile.name}
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
    </AppPage>
  );
}
