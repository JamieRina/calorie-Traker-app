import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, MapPinned, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppPage, PageHeader, SectionCard } from "@/components/app/AppPage";
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
  const { currentDate, uiMode, routeLibrary, workoutPresets, isBackendReady } = useApp();
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
        title="Activity"
        description={formatDateLabel(currentDate)}
        action={
          <span className="app-chip text-primary">
            {uiMode === "advanced" ? "Advanced" : "Simple"}
          </span>
        }
      />

      {dashboard ? (
        <>
          <SectionCard
            variant="hero"
            eyebrow="Today"
            title={`${Math.round(dashboard.caloriesBurned)} kcal burned`}
            description={`${dashboard.workoutCount} workouts`}
          >
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-[18px] bg-card/60 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/65">Workouts</p>
                <p className="display-font mt-1 text-xl font-bold text-foreground">{dashboard.workoutCount}</p>
              </div>
              <div className="rounded-[18px] bg-card/60 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/65">Food</p>
                <p className="display-font mt-1 text-xl font-bold text-foreground">{Math.round(dashboard.daily.calories)}</p>
              </div>
              <div className="rounded-[18px] bg-card/60 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/65">Net</p>
                <p className="display-font mt-1 text-xl font-bold text-foreground">{Math.round(dashboard.netCalories)}</p>
              </div>
            </div>
          </SectionCard>
        </>
      ) : null}

      <SectionCard eyebrow="Quick log" title="Presets">
        <div className="grid gap-3 sm:grid-cols-2">
          {workoutPresets.map((preset) => (
            <button
              key={preset.type}
              onClick={() => {
                if (!isBackendReady) {
                  toast.error("Workout logging is still getting ready. Try again in a moment.");
                  return;
                }
                workoutMutation.mutate(preset);
              }}
              className="rounded-[22px] border border-border/80 bg-card/90 p-3.5 text-left shadow-[var(--shadow-card)] transition-colors hover:bg-surface-elevated/75"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">{preset.type}</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Plus className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-secondary px-3 py-1.5">{preset.durationMinutes} min</span>
                <span className="rounded-full bg-secondary px-3 py-1.5">{preset.caloriesBurned} kcal</span>
                {uiMode === "advanced" ? <span className="rounded-full bg-secondary px-3 py-1.5">{preset.intensity}</span> : null}
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard eyebrow="Logged" title="Recent">
        <div className="space-y-2.5">
          {(workoutsQuery.data ?? []).length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-primary/20 bg-secondary/30 px-4 py-5 text-sm text-muted-foreground">
              Log a preset above and it will appear here.
            </div>
          ) : (
            (workoutsQuery.data ?? []).slice(0, 8).map((workout) => (
              <div key={workout.id} className="flex items-center gap-3 rounded-[18px] bg-surface-elevated/35 px-3.5 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
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
        <SectionCard eyebrow="Advanced" title="Routes">
          <div className="space-y-3">
            {routeLibrary.map((route) => (
              <article key={route.id} className="flex items-start gap-3 rounded-[24px] border border-border/80 bg-surface-elevated/35 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <MapPinned className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{route.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{route.location}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-card/80 px-3 py-2 text-right text-sm font-semibold text-foreground">
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
