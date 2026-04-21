import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import AppLogo from "@/components/AppLogo";
import { AppPage, SectionCard } from "@/components/app/AppPage";
import { CalorieRing } from "@/components/CalorieRing";
import { MacroBar } from "@/components/MacroBar";
import { MealCard } from "@/components/MealCard";
import { deleteMealLog, getDashboard } from "@/lib/api";
import { MealType, shiftDateKey, useApp } from "@/context/AppContext";

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
      eyebrow="Data"
      title="Still loading"
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
        Give it a moment, then try again.
      </div>
    </SectionCard>
  );
}

export default function Dashboard() {
  const { currentDate, setCurrentDate, uiMode, isBackendReady, isBootstrapping, retryBackendConnection } = useApp();
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
        <span className="app-chip text-primary">
          {uiMode === "advanced" ? "Advanced" : "Simple"}
        </span>
      </div>

      <div className="app-card flex items-center justify-between rounded-[22px] px-2.5 py-2.5">
        <button
          onClick={() => setCurrentDate(shiftDateKey(currentDate, -1))}
          className="flex h-9 w-9 items-center justify-center rounded-2xl text-foreground transition-colors hover:bg-secondary/70"
          aria-label="View previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="display-font text-base font-bold text-foreground">{formatDateLabel(currentDate)}</p>
        </div>
        <button
          onClick={() => setCurrentDate(shiftDateKey(currentDate, 1))}
          disabled={currentDate === todayKey}
          className="flex h-9 w-9 items-center justify-center rounded-2xl text-foreground transition-colors hover:bg-secondary/70 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="View next day"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {!isBackendReady && !isBootstrapping ? <DashboardFallback onRetry={retryBackendConnection} message="We could not load your dashboard yet." /> : null}

      {isBootstrapping || dashboardQuery.isLoading ? (
        <SectionCard eyebrow="Today" title="Loading">
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
            description={`${Math.round(dashboard.daily.calories)} / ${calorieGoal} kcal`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="grid min-w-0 flex-1 gap-2">
                <div className="rounded-[18px] bg-card/60 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/65">Meals</p>
                  <p className="display-font mt-1 text-xl font-bold text-foreground">{dashboard.mealCount}</p>
                </div>
                <div className="rounded-[18px] bg-card/60 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/65">Burned</p>
                  <p className="display-font mt-1 text-xl font-bold text-foreground">{Math.round(dashboard.caloriesBurned)}</p>
                </div>
              </div>
              <div className="shrink-0 rounded-[28px] bg-surface-elevated/70 p-3 shadow-[var(--shadow-card)]">
                <CalorieRing consumed={dashboard.daily.calories} goal={calorieGoal} size={148} />
              </div>
            </div>
          </SectionCard>

          {uiMode === "advanced" ? (
            <SectionCard eyebrow="Advanced" title="Macros">
              <div className="grid gap-3">
                <MacroBar label="Protein" current={dashboard.daily.protein} goal={proteinGoal} color="hsl(var(--protein))" />
                <MacroBar label="Carbs" current={dashboard.daily.carbs} goal={carbsGoal} color="hsl(var(--carbs))" />
                <MacroBar label="Fat" current={dashboard.daily.fat} goal={fatGoal} color="hsl(var(--fat))" />
              </div>
            </SectionCard>
          ) : null}

          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/60">Meals</p>
                <h2 className="display-font mt-1 text-xl font-bold text-foreground">Today&apos;s log</h2>
              </div>
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
