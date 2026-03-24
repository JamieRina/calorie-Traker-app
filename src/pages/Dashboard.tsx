import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Dumbbell, Flame, Footprints, Sparkles, Target, Zap } from "lucide-react";
import { toast } from "sonner";
import AppLogo from "@/components/AppLogo";
import { CalorieRing } from "@/components/CalorieRing";
import { MacroBar } from "@/components/MacroBar";
import { MealCard } from "@/components/MealCard";
import { MealType, shiftDateKey, useApp } from "@/context/AppContext";

const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${dateKey}T12:00:00`));
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Dashboard() {
  const {
    addMealLog,
    currentDate,
    dailyGoal,
    getDailyActivity,
    getDailyTotals,
    getMealsByType,
    getNutrientGaps,
    getSmartSuggestions,
    getStreakInfo,
    setCurrentDate,
  } = useApp();

  const totals = getDailyTotals();
  const activity = getDailyActivity();
  const streak = getStreakInfo();
  const gaps = getNutrientGaps().filter((gap) => gap.remaining > 0);
  const suggestions = getSmartSuggestions();
  const todayKey = getTodayKey();
  const isToday = currentDate === todayKey;
  const highlightGaps = gaps.slice(0, 2);
  const gapCopy = highlightGaps.length
    ? `You are still short on ${highlightGaps.map((gap) => `${Math.round(gap.remaining)}${gap.unit} ${gap.label.toLowerCase()}`).join(" and ")}.`
    : "You have covered your main nutrition targets. Use dinner or a snack to keep the streak rolling.";

  const statCards = [
    {
      icon: Footprints,
      label: "Steps",
      value: activity.steps.toLocaleString(),
      detail: `${Math.round((activity.steps / dailyGoal.steps) * 100)}% of goal`,
    },
    {
      icon: Dumbbell,
      label: "Burned",
      value: `${Math.round(activity.totalBurn)} kcal`,
      detail: `${Math.round(activity.workoutBurn)} workout + ${Math.round(activity.stepBurn)} walk`,
    },
    {
      icon: Target,
      label: "Net",
      value: `${Math.round(activity.netCalories)} kcal`,
      detail: activity.netCalories <= dailyGoal.calories ? "In target range" : "Running above plan",
    },
  ];

  return (
    <div className="flex h-full flex-col overflow-y-auto pb-28">
      <div className="px-5 pt-6 safe-top">
        <div className="flex items-start justify-between gap-4">
          <AppLogo />
          <div className="rounded-full border border-primary/15 bg-white/70 px-3 py-1.5 text-right shadow-sm backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Streak</p>
            <p className="display-font text-lg font-bold text-foreground">{streak.count} days</p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/70 bg-white/72 px-3 py-2 shadow-[0_18px_32px_-28px_rgba(0,0,0,0.45)] backdrop-blur-sm">
          <button
            onClick={() => setCurrentDate(shiftDateKey(currentDate, -1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-secondary"
            aria-label="View previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/55">
              {isToday ? "Today" : "History view"}
            </p>
            <p className="display-font text-base font-bold tracking-tight text-foreground">{formatDateLabel(currentDate)}</p>
          </div>
          <button
            onClick={() => setCurrentDate(shiftDateKey(currentDate, 1))}
            disabled={isToday}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="View next day"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-5 mt-5 rounded-[30px] bg-[linear-gradient(145deg,hsl(var(--primary)),hsl(var(--primary)/0.88)_45%,hsl(var(--accent)/0.95))] p-5 text-white shadow-[0_34px_60px_-32px_hsl(var(--primary)/0.75)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-[17rem]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">Live calorie balance</p>
            <h1 className="display-font mt-2 text-[2rem] font-bold leading-none tracking-tight">Fast logging, clear net calories.</h1>
            <p className="mt-3 text-sm leading-6 text-white/78">
              Logged {Math.round(totals.calories)} kcal so far and burned {Math.round(activity.totalBurn)} kcal from movement today.
            </p>
          </div>
          <div className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-right backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">Forgiveness</p>
            <p className="text-sm font-semibold text-white">
              {streak.forgivenessRemaining > 0 ? "1 skip left" : "Used this week"}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px] md:items-center">
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
            {statCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/12 bg-white/10 p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-white/85">
                  <card.icon className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">{card.label}</span>
                </div>
                <p className="display-font mt-3 text-xl font-bold tracking-tight text-white">{card.value}</p>
                <p className="mt-1 text-xs text-white/72">{card.detail}</p>
              </div>
            ))}
          </div>
          <div className="justify-self-center rounded-[28px] bg-white/94 p-4 text-foreground shadow-[0_30px_50px_-28px_rgba(0,0,0,0.45)]">
            <CalorieRing consumed={totals.calories} goal={activity.adjustedBudget} size={164} />
          </div>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mx-5 mt-4 rounded-[28px] border border-white/70 bg-card/84 p-4 shadow-[0_22px_40px_-34px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Macros</p>
            <h2 className="display-font mt-1 text-xl font-bold tracking-tight text-foreground">Keep dinner focused</h2>
          </div>
          <div className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
            Budget {Math.round(activity.adjustedBudget)} kcal
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          <MacroBar label="Protein" current={totals.protein} goal={dailyGoal.protein} color="hsl(var(--primary))" />
          <MacroBar label="Carbs" current={totals.carbs} goal={dailyGoal.carbs} color="hsl(var(--accent))" />
          <MacroBar label="Fat" current={totals.fat} goal={dailyGoal.fat} color="hsl(var(--chart-2))" />
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mx-5 mt-4 rounded-[28px] border border-white/70 bg-card/84 p-4 shadow-[0_22px_40px_-34px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Nutrient gap insight</p>
            <p className="mt-2 text-sm leading-6 text-foreground">{gapCopy}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {gaps.slice(0, 3).map((gap) => (
            <span key={gap.key} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground">
              {gap.label}: {Math.round(gap.remaining)}{gap.unit} left
            </span>
          ))}
        </div>
      </motion.section>

      <section className="mt-4 px-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Smart suggestions</p>
            <h2 className="display-font mt-1 text-xl font-bold tracking-tight text-foreground">Close the biggest gaps in one tap</h2>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-white/72 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">
            <Zap className="h-3.5 w-3.5 text-accent" />
            Quick add
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {suggestions.map((food, index) => (
            <motion.article
              key={food.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + (index * 0.04) }}
              className="min-w-[220px] flex-1 rounded-[26px] border border-white/70 bg-card/86 p-4 shadow-[0_22px_38px_-34px_rgba(0,0,0,0.45)] backdrop-blur-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/55">{food.source}</p>
                  <h3 className="display-font mt-2 text-lg font-bold tracking-tight text-foreground">{food.name}</h3>
                </div>
                <button
                  onClick={() => {
                    addMealLog({ food, quantity: 1, mealType: food.mealHints[0] });
                    toast.success(`${food.name} added to ${food.mealHints[0]}.`);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_18px_30px_-24px_hsl(var(--primary)/0.8)] transition-transform active:scale-95"
                  aria-label={`Quick add ${food.name}`}
                >
                  <Flame className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{food.servingSize}</p>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-secondary/75 px-3 py-2 text-sm font-medium text-foreground">
                <span>{Math.round(food.calories)} kcal</span>
                <span>{Math.round(food.protein)}g protein</span>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="mt-5 space-y-4 px-5">
        {mealTypes.map((mealType, index) => (
          <motion.div key={mealType} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + (index * 0.04) }}>
            <MealCard mealType={mealType} items={getMealsByType(mealType)} />
          </motion.div>
        ))}
      </section>

      <div className="h-8" />
    </div>
  );
}
