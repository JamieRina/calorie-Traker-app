import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, Dumbbell, Flame, MapPinned, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AppPage, MetricCard, PageHeader, SectionCard } from "@/components/app/AppPage";
import { createWorkoutEntry, getDashboard, listWorkouts } from "@/lib/api";
import { useApp } from "@/context/AppContext";

function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${dateKey}T12:00:00`));
}

export default function Activity() {
  const { currentDate, uiMode, routeLibrary, workoutPresets, isBackendReady, backendError, retryBackendConnection } = useApp();
  const queryClient = useQueryClient();

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", currentDate],
    queryFn: () => getDashboard(currentDate),
    enabled: isBackendReady,
  });

  const workoutsQuery = useQuery({
    queryKey: ["workouts"],
    queryFn: listWorkouts,
    enabled: isBackendReady,
  });

  const workoutMutation = useMutation({
    mutationFn: (preset: (typeof workoutPresets)[number]) =>
      createWorkoutEntry({
        title: preset.type,
        caloriesBurned: preset.caloriesBurned,
        durationMinutes: preset.durationMinutes,
        performedAt: new Date(`${currentDate}T12:00:00`).toISOString(),
      }),
    onSuccess: (workout) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", currentDate] });
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      toast.success(`${workout.title} added.`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not log that workout.");
    },
  });

  const dashboard = dashboardQuery.data;

  return (
    <AppPage>
      <PageHeader
        eyebrow="Activity"
        title="Movement made simple"
        description={`For ${formatDateLabel(currentDate)}, keep the focus on the workouts you actually logged.`}
        action={
          <span className="rounded-full border border-white/75 bg-white/88 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary/70 shadow-sm">
            {uiMode === "advanced" ? "Advanced" : "Simple"}
          </span>
        }
      />

      {!isBackendReady ? (
        <SectionCard
          eyebrow="Backend"
          title="Workout sync needs the backend"
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
            Start the backend and this page will switch to live workout data.
          </div>
        </SectionCard>
      ) : null}

      {dashboard ? (
        <>
          <SectionCard
            variant="hero"
            eyebrow="Today"
            title={`${Math.round(dashboard.caloriesBurned)} kcal burned`}
            description={`${dashboard.workoutCount} workouts logged today.`}
            action={
              <div className="rounded-2xl border border-primary/10 bg-white/72 px-3 py-2 text-right backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/60">Net</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{Math.round(dashboard.netCalories)} kcal</p>
              </div>
            }
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white/65 bg-white/66 px-4 py-4 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/60">Workouts</p>
                <p className="display-font mt-2 text-2xl font-bold text-foreground">{dashboard.workoutCount}</p>
              </div>
              <div className="rounded-[22px] border border-white/65 bg-white/66 px-4 py-4 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/60">Food logged</p>
                <p className="display-font mt-2 text-2xl font-bold text-foreground">{Math.round(dashboard.daily.calories)} kcal</p>
              </div>
              <div className="rounded-[22px] border border-white/65 bg-white/66 px-4 py-4 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/60">Burned</p>
                <p className="display-font mt-2 text-2xl font-bold text-foreground">{Math.round(dashboard.caloriesBurned)} kcal</p>
              </div>
            </div>
          </SectionCard>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard icon={Flame} label="Today burn" value={`${Math.round(dashboard.caloriesBurned)} kcal`} detail={`${dashboard.workoutCount} workouts`} />
            <MetricCard icon={Dumbbell} label="Latest intake" value={`${Math.round(dashboard.daily.calories)} kcal`} detail={`${dashboard.mealCount} meals logged`} />
            <MetricCard icon={Clock3} label="Recent sessions" value={`${dashboard.workouts.length}`} detail="Counted in today's total" tone="accent" />
          </div>
        </>
      ) : null}

      <SectionCard eyebrow="Quick Log" title="Fast preset workouts" description="One tap is enough for the sessions you repeat most often.">
        <div className="grid gap-3 sm:grid-cols-2">
          {workoutPresets.map((preset) => (
            <button
              key={preset.type}
              onClick={() => {
                if (!isBackendReady) {
                  toast.error("Start the backend before logging workouts.");
                  return;
                }
                workoutMutation.mutate(preset);
              }}
              className="rounded-[24px] border border-white/75 bg-white/88 p-4 text-left transition-colors hover:bg-white"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">{preset.type}</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Plus className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-secondary px-3 py-1.5">{preset.durationMinutes} min</span>
                <span className="rounded-full bg-secondary px-3 py-1.5">{preset.caloriesBurned} kcal</span>
                <span className="rounded-full bg-secondary px-3 py-1.5">{preset.intensity}</span>
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard eyebrow="Logged" title="Your recent workouts" description="Only the items that have actually been saved to the backend show up here.">
        <div className="space-y-3">
          {(workoutsQuery.data ?? []).length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-primary/20 bg-secondary/30 px-4 py-5 text-sm text-muted-foreground">
              Log a preset above and it will appear here.
            </div>
          ) : (
            (workoutsQuery.data ?? []).slice(0, 8).map((workout) => (
              <div key={workout.id} className="flex items-center gap-3 rounded-[22px] border border-white/80 bg-secondary/25 px-4 py-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                  <Clock3 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{workout.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {workout.durationMinutes} min / {Math.round(workout.caloriesBurned)} kcal
                  </p>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
                  {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(workout.performedAt))}
                </p>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      {uiMode === "advanced" ? (
        <SectionCard eyebrow="Advanced" title="Walking ideas" description="Optional extras stay hidden until you choose advanced mode.">
          <div className="space-y-3">
            {routeLibrary.map((route) => (
              <article key={route.id} className="flex items-start gap-3 rounded-[24px] border border-white/80 bg-secondary/25 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                  <MapPinned className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{route.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{route.location}</p>
                </div>
                <div className="rounded-2xl bg-white px-3 py-2 text-right text-sm font-semibold text-foreground shadow-sm">
                  <p>{route.distanceKm.toFixed(1)} km</p>
                  <p className="mt-1 text-xs text-muted-foreground">{route.estimatedBurn} kcal</p>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </AppPage>
  );
}
