import { motion } from "framer-motion";
import { Clock3, Dumbbell, Flame, Footprints, MapPinned, Plus } from "lucide-react";
import { toast } from "sonner";
import { WORKOUT_PRESETS, useApp } from "@/context/AppContext";

function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${dateKey}T12:00:00`));
}

export default function Activity() {
  const { addWorkout, currentDate, dailyGoal, getDailyActivity, routeLibrary } = useApp();
  const activity = getDailyActivity();
  const stepProgress = Math.min((activity.steps / dailyGoal.steps) * 100, 100);

  return (
    <div className="flex h-full flex-col overflow-y-auto pb-28">
      <div className="px-5 pt-6 safe-top">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Movement sync</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <h1 className="display-font text-[2rem] font-bold leading-none tracking-tight text-foreground">Activity and burn</h1>
            <p className="mt-2 text-sm text-muted-foreground">{formatDateLabel(currentDate)}  |  movement feeds the live calorie balance.</p>
          </div>
          <div className="rounded-full bg-white/72 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">Health sync live</div>
        </div>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-5 mt-5 rounded-[30px] bg-[linear-gradient(150deg,hsl(var(--foreground)),hsl(var(--primary))_58%,hsl(var(--accent)))] p-5 text-white shadow-[0_34px_58px_-34px_rgba(10,47,43,0.75)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">Today</p>
            <h2 className="display-font mt-2 text-3xl font-bold tracking-tight">{activity.steps.toLocaleString()} steps</h2>
            <p className="mt-2 text-sm text-white/80">
              {activity.distanceKm.toFixed(1)} km walked and {activity.activeMinutes} active minutes logged.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-right backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">Route</p>
            <p className="mt-1 text-sm font-semibold text-white">{activity.routeName ?? "Freestyle walk"}</p>
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-white/82">Step goal progress</span>
            <span className="font-semibold text-white">{Math.round(stepProgress)}%</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/18">
            <div className="h-full rounded-full bg-white" style={{ width: `${stepProgress}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/76">
            <span className="rounded-full bg-white/10 px-3 py-1.5">Goal {dailyGoal.steps.toLocaleString()} steps</span>
            <span className="rounded-full bg-white/10 px-3 py-1.5">Burn {Math.round(activity.stepBurn)} kcal</span>
          </div>
        </div>
      </motion.section>

      <section className="mt-4 grid gap-3 px-5 sm:grid-cols-3">
        {[
          { icon: Footprints, label: "Step burn", value: `${Math.round(activity.stepBurn)} kcal`, detail: `${activity.distanceKm.toFixed(1)} km` },
          { icon: Dumbbell, label: "Workout burn", value: `${Math.round(activity.workoutBurn)} kcal`, detail: `${activity.workouts.length} sessions today` },
          { icon: Flame, label: "Total burn", value: `${Math.round(activity.totalBurn)} kcal`, detail: `${Math.round(activity.netCalories)} kcal net` },
        ].map((card, index) => (
          <motion.article
            key={card.label}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + (index * 0.04) }}
            className="rounded-[26px] border border-white/70 bg-card/84 p-4 shadow-[0_20px_34px_-32px_rgba(0,0,0,0.45)] backdrop-blur-sm"
          >
            <card.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/55">{card.label}</p>
            <p className="display-font mt-2 text-2xl font-bold tracking-tight text-foreground">{card.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{card.detail}</p>
          </motion.article>
        ))}
      </section>

      <section className="mx-5 mt-5 rounded-[28px] border border-white/70 bg-card/84 p-4 shadow-[0_22px_40px_-34px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Workout presets</p>
            <h2 className="display-font mt-1 text-xl font-bold tracking-tight text-foreground">Log a session without friction</h2>
          </div>
          <div className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">{WORKOUT_PRESETS.length} options</div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {WORKOUT_PRESETS.map((preset) => (
            <button
              key={preset.type}
              onClick={() => {
                addWorkout(preset);
                toast.success(`${preset.type} added to today.`);
              }}
              className="rounded-[24px] border border-white/70 bg-white/82 p-4 text-left shadow-[0_18px_30px_-30px_rgba(0,0,0,0.4)] transition-transform hover:-translate-y-0.5"
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
      </section>

      <section className="mx-5 mt-5 rounded-[28px] border border-white/70 bg-card/84 p-4 shadow-[0_22px_40px_-34px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Today&apos;s sessions</p>
            <h2 className="display-font mt-1 text-xl font-bold tracking-tight text-foreground">Movement already counted</h2>
          </div>
          <div className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">{activity.workouts.length} logged</div>
        </div>
        <div className="mt-4 space-y-3">
          {activity.workouts.map((workout) => (
            <div key={workout.id} className="flex items-center gap-3 rounded-[24px] border border-white/70 bg-white/82 px-4 py-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
                <Clock3 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{workout.type}</p>
                <p className="mt-1 text-xs text-muted-foreground">{workout.durationMinutes} min  |  {workout.intensity} intensity</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">{workout.caloriesBurned} kcal</p>
                <p className="mt-1 text-xs text-muted-foreground">burned</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 py-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Route ideas</p>
            <h2 className="display-font mt-1 text-xl font-bold tracking-tight text-foreground">Keep walking frictionless</h2>
          </div>
          <MapPinned className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-3">
          {routeLibrary.map((route, index) => (
            <motion.article
              key={route.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + (index * 0.04) }}
              className="rounded-[26px] border border-white/70 bg-card/84 p-4 shadow-[0_22px_38px_-34px_rgba(0,0,0,0.45)] backdrop-blur-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/55">{route.location}</p>
                  <h3 className="display-font mt-1 text-lg font-bold tracking-tight text-foreground">{route.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{route.terrain}</p>
                </div>
                <div className="rounded-2xl bg-secondary px-3 py-2 text-right text-sm font-semibold text-foreground">
                  <p>{route.distanceKm.toFixed(1)} km</p>
                  <p className="mt-1 text-xs text-muted-foreground">{route.estimatedBurn} kcal</p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>
    </div>
  );
}
