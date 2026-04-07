import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Flame, RefreshCw, UtensilsCrossed, Zap } from "lucide-react";
import { toast } from "sonner";
import AppLogo from "@/components/AppLogo";
import { AppPage, MetricCard, SectionCard } from "@/components/app/AppPage";
import { CalorieRing } from "@/components/CalorieRing";
import { MacroBar } from "@/components/MacroBar";
import { MealCard } from "@/components/MealCard";
import { deleteMealLog, getDashboard } from "@/lib/api";
import { MEAL_LABELS, MealType, shiftDateKey, useApp } from "@/context/AppContext";

const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(`${dateKey}T12:00:00`));
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function DashboardFallback({ onRetry, message }: { onRetry: () => void; message: string }) {
  return (
    <SectionCard
      eyebrow="Backend"
      title="Backend not ready"
      description={message}
      action={
        <button
          onClick={onRetry}
          className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      }
    >
      <div className="rounded-[22px] bg-secondary/35 px-4 py-4 text-sm text-muted-foreground">
        Start the backend with <span className="font-semibold text-foreground">npm run backend:dev</span>, then refresh this screen.
      </div>
    </SectionCard>
  );
}

export default function Dashboard() {
  const { currentDate, setCurrentDate, uiMode, isBackendReady, isBootstrapping, backendError, retryBackendConnection } = useApp();
  const queryClient = useQueryClient();

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", currentDate],
    queryFn: () => getDashboard(currentDate),
    enabled: isBackendReady,
  });
  const todayKey = getTodayKey();

  const deleteMutation = useMutation({
    mutationFn: deleteMealLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", currentDate] });
      queryClient.invalidateQueries({ queryKey: ["recent-foods"] });
      toast.success("Meal removed.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not remove meal.");
    },
  });

  const dashboard = dashboardQuery.data;
  const calorieGoal = dashboard?.goal?.calories ?? 2200;
  const proteinGoal = dashboard?.goal?.protein ?? 150;
  const carbsGoal = dashboard?.goal?.carbs ?? 220;
  const fatGoal = dashboard?.goal?.fat ?? 70;
  const remainingCalories = Math.max(Math.round(dashboard?.remainingCalories ?? calorieGoal), 0);
  const groupedMeals = mealTypes.reduce<Record<MealType, typeof dashboard.meals>>(
    (acc, mealType) => ({
      ...acc,
      [mealType]: dashboard?.meals.filter((meal) => meal.mealType === mealType) ?? [],
    }),
    {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    },
  );

  return (
    <AppPage>
      <div className="flex items-start justify-between gap-4">
        <AppLogo />
        <span className="rounded-full border border-white/75 bg-white/88 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary/70 shadow-sm">
          {uiMode === "advanced" ? "Advanced" : "Simple"}
        </span>
      </div>

      <div className="flex items-center justify-between rounded-[24px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(238,248,248,0.88))] px-3 py-3 shadow-[0_16px_30px_-24px_rgba(22,40,46,0.14)]">
        <button
          onClick={() => setCurrentDate(shiftDateKey(currentDate, -1))}
          className="flex h-10 w-10 items-center justify-center rounded-2xl text-foreground transition-colors hover:bg-secondary/70"
          aria-label="View previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Day view</p>
          <p className="display-font mt-1 text-lg font-bold tracking-tight text-foreground">{formatDateLabel(currentDate)}</p>
        </div>
        <button
          onClick={() => setCurrentDate(shiftDateKey(currentDate, 1))}
          disabled={currentDate === todayKey}
          className="flex h-10 w-10 items-center justify-center rounded-2xl text-foreground transition-colors hover:bg-secondary/70 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="View next day"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {!isBackendReady && !isBootstrapping ? <DashboardFallback onRetry={retryBackendConnection} message={backendError ?? "Connection failed."} /> : null}

      {isBootstrapping || dashboardQuery.isLoading ? (
        <SectionCard eyebrow="Today" title="Loading your day" description="Pulling meals, calories, and workouts from the backend.">
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }, (_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-[24px] bg-secondary/60" />
            ))}
          </div>
        </SectionCard>
      ) : null}

      {dashboardQuery.isError ? (
        <DashboardFallback
          onRetry={() => {
            retryBackendConnection();
            dashboardQuery.refetch();
          }}
          message={dashboardQuery.error instanceof Error ? dashboardQuery.error.message : "Could not load your dashboard."}
        />
      ) : null}

      {dashboard ? (
        <>
          <SectionCard
            variant="hero"
            eyebrow="Today"
          title={`${remainingCalories} kcal left`}
          description={`${Math.round(dashboard.daily.calories)} logged today`}
          action={
              <div className="rounded-2xl border border-primary/10 bg-white/72 px-3 py-2 text-right backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/60">Burned</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{Math.round(dashboard.caloriesBurned)} kcal</p>
              </div>
            }
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/72 px-3 py-1.5 text-xs font-semibold text-foreground">{dashboard.mealCount} meals</span>
                  <span className="rounded-full bg-white/72 px-3 py-1.5 text-xs font-semibold text-foreground">{dashboard.workoutCount} workouts</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-white/65 bg-white/66 px-4 py-4 backdrop-blur-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/60">Logged</p>
                    <p className="display-font mt-2 text-2xl font-bold text-foreground">{Math.round(dashboard.daily.calories)} kcal</p>
                  </div>
                  <div className="rounded-[22px] border border-white/65 bg-white/66 px-4 py-4 backdrop-blur-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/60">Goal</p>
                    <p className="display-font mt-2 text-2xl font-bold text-foreground">{calorieGoal} kcal</p>
                  </div>
                </div>
              </div>
              <div className="mx-auto rounded-[30px] bg-white/96 p-4 shadow-[0_22px_38px_-26px_rgba(25,53,63,0.24)] sm:mx-0">
                <CalorieRing consumed={dashboard.daily.calories} goal={calorieGoal} size={168} />
              </div>
            </div>
          </SectionCard>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard icon={Flame} label="Consumed" value={`${Math.round(dashboard.daily.calories)} kcal`} detail={`${dashboard.mealCount} meals logged`} />
            <MetricCard icon={Zap} label="Burned" value={`${Math.round(dashboard.caloriesBurned)} kcal`} detail={`${dashboard.workoutCount} workouts today`} />
            <MetricCard icon={UtensilsCrossed} label="Meals" value={`${dashboard.mealCount}`} detail={`Goal ${calorieGoal} kcal`} tone="accent" />
          </div>

          {uiMode === "advanced" ? (
            <SectionCard eyebrow="Advanced" title="Macro overview" description="Extra detail stays here so the default home screen stays light.">
              <div className="grid gap-3">
                <MacroBar label="Protein" current={dashboard.daily.protein} goal={proteinGoal} color="hsl(var(--primary))" />
                <MacroBar label="Carbs" current={dashboard.daily.carbs} goal={carbsGoal} color="hsl(var(--accent))" />
                <MacroBar label="Fat" current={dashboard.daily.fat} goal={fatGoal} color="hsl(var(--chart-2))" />
              </div>
              <div className="mt-4 grid grid-cols-7 gap-2">
                {dashboard.weeklyTrend.map((point) => (
                  <div key={point.day} className="rounded-[18px] bg-secondary/40 px-2 py-3 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{point.label}</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{Math.round(point.calories)}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : null}

          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Meals</p>
                <h2 className="display-font mt-1 text-2xl font-bold tracking-tight text-foreground">Today&apos;s log</h2>
              </div>
              <p className="text-sm text-muted-foreground">Add or remove in one tap.</p>
            </div>
            {mealTypes.map((mealType) => (
              <MealCard
                key={mealType}
                mealType={mealType}
                entries={groupedMeals[mealType]}
                onDelete={(mealId) => deleteMutation.mutate(mealId)}
                isMutating={deleteMutation.isPending}
              />
            ))}
          </div>
        </>
      ) : null}
    </AppPage>
  );
}
