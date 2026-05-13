import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import AppLogo from "@/components/AppLogo";
import { AppPage, SectionCard } from "@/components/app/AppPage";
import { CalorieRing } from "@/components/CalorieRing";
import { MacroBar } from "@/components/MacroBar";
import { MealCard } from "@/components/MealCard";
import { deleteMealLog, getDashboard, updateMealLog, type DashboardMeal } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { MealType, MEAL_LABELS, shiftDateKey, useApp } from "@/context/AppContext";

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

function formatTimeInput(timestamp: string) {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function combineDateAndTime(dateKey: string, time: string) {
  const safeTime = /^\d{2}:\d{2}$/.test(time) ? time : "12:00";
  return new Date(`${dateKey}T${safeTime}:00`).toISOString();
}

export default function Dashboard() {
  const { currentDate, setCurrentDate, uiMode, isBackendReady, isBootstrapping, retryBackendConnection } = useApp();
  const queryClient = useQueryClient();
  const [editingMeal, setEditingMeal] = useState<DashboardMeal | null>(null);
  const [editMealType, setEditMealType] = useState<MealType>("breakfast");
  const [editTime, setEditTime] = useState("12:00");

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

  const updateMutation = useMutation({
    mutationFn: (payload: { mealId: string; mealType: MealType; time: string }) =>
      updateMealLog(payload.mealId, {
        mealType: payload.mealType,
        consumedAt: combineDateAndTime(currentDate, payload.time),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", currentDate] });
      setEditingMeal(null);
      toast.success("Meal updated.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update meal.");
    },
  });

  const dashboard = dashboardQuery.data;
  const calorieGoal = dashboard?.goal?.calories ?? 2200;
  const proteinGoal = dashboard?.goal?.protein ?? 150;
  const carbsGoal = dashboard?.goal?.carbs ?? 220;
  const fatGoal = dashboard?.goal?.fat ?? 70;
  const dailyCalories = dashboard?.daily.calories ?? 0;
  const dailyProtein = dashboard?.daily.protein ?? 0;
  const dailyCarbs = dashboard?.daily.carbs ?? 0;
  const dailyFat = dashboard?.daily.fat ?? 0;
  const mealCount = dashboard?.mealCount ?? 0;
  const remainingCalories = Math.max(Math.round(calorieGoal - dailyCalories), 0);
  const allMeals = [...(dashboard?.meals ?? [])].sort(
    (first, second) => new Date(second.consumedAt).getTime() - new Date(first.consumedAt).getTime(),
  );
  const groupedMeals = mealTypes.reduce<Record<MealType, DashboardMeal[]>>(
    (acc, mealType) => ({
      ...acc,
      [mealType]: allMeals.filter((meal) => meal.mealType === mealType),
    }),
    {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    },
  );

  const handleDeleteMeal = (mealId: string) => {
    deleteMutation.mutate(mealId);
  };

  const handleEditMeal = (meal: DashboardMeal) => {
    setEditingMeal(meal);
    setEditMealType(meal.mealType);
    setEditTime(formatTimeInput(meal.consumedAt));
  };

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
            description={`${Math.round(dailyCalories)} / ${calorieGoal} kcal`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="grid min-w-0 flex-1 gap-2">
                <div className="rounded-[18px] bg-card/60 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/65">Meals</p>
                  <p className="display-font mt-1 text-xl font-bold text-foreground">{mealCount}</p>
                </div>
                <div className="rounded-[18px] bg-card/60 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/65">Burned</p>
                  <p className="display-font mt-1 text-xl font-bold text-foreground">{Math.round(dashboard.caloriesBurned)}</p>
                </div>
              </div>
              <div className="shrink-0 rounded-[28px] bg-surface-elevated/70 p-3 shadow-[var(--shadow-card)]">
                <CalorieRing consumed={dailyCalories} goal={calorieGoal} size={148} />
              </div>
            </div>
          </SectionCard>

          {uiMode === "advanced" ? (
            <SectionCard eyebrow="Advanced" title="Macros">
              <div className="grid gap-3">
                <MacroBar label="Protein" current={dailyProtein} goal={proteinGoal} color="hsl(var(--protein))" />
                <MacroBar label="Carbs" current={dailyCarbs} goal={carbsGoal} color="hsl(var(--carbs))" />
                <MacroBar label="Fat" current={dailyFat} goal={fatGoal} color="hsl(var(--fat))" />
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
                onEdit={handleEditMeal}
                onDelete={handleDeleteMeal}
                isMutating={deleteMutation.isPending || updateMutation.isPending}
              />
            ))}
          </div>
        </>
      ) : null}

      {editingMeal ? (
        <div className="fixed inset-x-4 bottom-24 z-40 rounded-[28px] border border-border/80 bg-card/95 p-4 shadow-[0_34px_70px_-36px_rgb(0_0_0/0.75)] backdrop-blur-xl sm:mx-auto sm:max-w-md">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/60">Edit meal</p>
              <h2 className="display-font mt-1 truncate text-xl font-bold text-foreground">
                {editingMeal.itemCount === 1 ? editingMeal.itemNames[0] : `${editingMeal.itemCount} foods`}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setEditingMeal(null)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary"
              aria-label="Close meal editor"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="grid grid-cols-4 gap-2">
              {mealTypes.map((mealType) => (
                <button
                  key={mealType}
                  type="button"
                  onClick={() => setEditMealType(mealType)}
                  className={`min-h-11 rounded-2xl border px-2 text-xs font-semibold ${
                    editMealType === mealType
                      ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-button)]"
                      : "border-border/80 bg-surface-elevated/60 text-foreground"
                  }`}
                >
                  {MEAL_LABELS[mealType]}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Time</span>
              <Input
                type="time"
                value={editTime}
                onChange={(event) => setEditTime(event.target.value)}
                className="h-12 border-border/80 bg-surface-elevated/80"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() =>
              updateMutation.mutate({
                mealId: editingMeal.id,
                mealType: editMealType,
                time: editTime,
              })
            }
            disabled={updateMutation.isPending}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-button)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <Check className="h-4 w-4" />
            Save meal
          </button>
        </div>
      ) : null}
    </AppPage>
  );
}
