import { useQuery } from "@tanstack/react-query";
import { Gauge, RefreshCw, Settings2, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";
import { AppPage, MetricCard, PageHeader, SectionCard } from "@/components/app/AppPage";
import { getProfileSummary } from "@/lib/api";
import { useApp } from "@/context/AppContext";

export default function Settings() {
  const { uiMode, setUiMode, isBackendReady, isBootstrapping, backendError, retryBackendConnection } = useApp();

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
        title="Simple by default"
        description="The lighter interface stays on by default. Advanced mode adds detail without crowding the main screens."
      />

      <SectionCard
        variant="hero"
        eyebrow="Mode"
        title={uiMode === "advanced" ? "Advanced mode is on" : "Simple mode is on"}
        description={uiMode === "advanced" ? "Extra detail appears across the app." : "Home, activity, and progress stay focused on the essentials."}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              mode: "simple" as const,
              title: "Simple",
              detail: "Best for quick daily logging.",
              icon: SlidersHorizontal,
            },
            {
              mode: "advanced" as const,
              title: "Advanced",
              detail: "Shows more analysis and extra sections.",
              icon: Gauge,
            },
          ].map((option) => (
            <button
              key={option.mode}
              onClick={() => setUiMode(option.mode)}
              className={`rounded-[24px] border p-4 text-left transition-all ${
                uiMode === option.mode ? "border-primary/15 bg-white/78 text-foreground" : "border-white/55 bg-white/54 text-foreground/85"
              }`}
            >
              <option.icon className="h-4 w-4" />
              <p className="mt-3 text-sm font-semibold">{option.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{option.detail}</p>
            </button>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-3 sm:grid-cols-2">
        <MetricCard icon={ShieldCheck} label="Backend" value={isBackendReady ? "Connected" : isBootstrapping ? "Loading" : "Offline"} detail={isBackendReady ? "Live meals, foods, and workouts enabled" : "Start the backend to sync data"} />
        <MetricCard icon={Settings2} label="Interface" value={uiMode === "advanced" ? "Advanced" : "Simple"} detail="You can switch modes any time" tone="accent" />
      </div>

      {!isBackendReady ? (
        <SectionCard
          eyebrow="Connection"
          title="Backend connection"
          description={backendError ?? "The app could not reach the backend yet."}
          action={
            <button
              onClick={retryBackendConnection}
              className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          }
        >
          <div className="rounded-[22px] bg-secondary/35 px-4 py-4 text-sm text-muted-foreground">
            Run <span className="font-semibold text-foreground">npm run backend:dev</span> to bring the live data back.
          </div>
        </SectionCard>
      ) : null}

      {profile ? (
        <SectionCard
          eyebrow="Account"
          title={profile.name}
          description={`${profile.goal} / ${profile.activityLevel} / ${profile.currentWeight.toFixed(1)} kg`}
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
        <SectionCard eyebrow="Advanced" title="Profile detail" description="Extra target and preference detail only appears when you choose advanced mode.">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              `Protein target: ${goal?.protein ?? 150} g`,
              `Carb target: ${goal?.carbs ?? 220} g`,
              `Fat target: ${goal?.fat ?? 70} g`,
              `Fibre target: ${goal?.fiber ?? 30} g`,
            ].map((item) => (
              <div key={item} className="rounded-[22px] border border-white/80 bg-secondary/25 px-4 py-3 text-sm font-medium text-foreground">
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
