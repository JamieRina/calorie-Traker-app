import { motion } from "framer-motion";
import { BadgeCheck, Bell, Flag, Settings2, Target, UserRound, UtensilsCrossed } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function Profile() {
  const { dailyGoal, favouriteFoodIds, getStreakInfo, mealLogs, profile, weightEntries, workoutLogs } = useApp();
  const streak = getStreakInfo();
  const latestWeight = weightEntries[weightEntries.length - 1]?.weight ?? profile.currentWeight;
  const weightLost = Number((weightEntries[0].weight - latestWeight).toFixed(1));

  return (
    <div className="flex h-full flex-col overflow-y-auto pb-28">
      <div className="px-5 pt-6 safe-top">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Profile and settings</p>
        <h1 className="display-font mt-2 text-[2rem] font-bold leading-none tracking-tight text-foreground">Personal plan, not admin clutter</h1>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-5 mt-5 rounded-[30px] bg-[linear-gradient(150deg,hsl(var(--foreground)),hsl(var(--primary))_55%,hsl(var(--accent)))] p-5 text-white shadow-[0_34px_58px_-34px_rgba(10,47,43,0.78)]"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-white/12 backdrop-blur-sm">
            <UserRound className="h-8 w-8 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">Account</p>
            <h2 className="display-font mt-2 text-2xl font-bold tracking-tight text-white">{profile.name}</h2>
            <p className="mt-2 text-sm text-white/80">
              {profile.goal}  |  {profile.activityLevel}  |  {latestWeight.toFixed(1)} kg right now
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-white/84">Onboarding completion</span>
            <span className="text-sm font-semibold text-white">{profile.onboardingCompletion}%</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/16">
            <div className="h-full rounded-full bg-white" style={{ width: `${profile.onboardingCompletion}%` }} />
          </div>
          <p className="mt-3 text-sm text-white/78">Connect device health sync and fine-tune notifications to finish setup.</p>
        </div>
      </motion.section>

      <section className="mt-4 grid gap-3 px-5 sm:grid-cols-3">
        {[
          { label: "Meals logged", value: mealLogs.length.toString(), detail: "Across the seeded week" },
          { label: "Workouts", value: workoutLogs.length.toString(), detail: "Movement sessions counted" },
          { label: "Favourites", value: favouriteFoodIds.length.toString(), detail: "Fast repeat meals" },
        ].map((card, index) => (
          <motion.article
            key={card.label}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + (index * 0.04) }}
            className="rounded-[26px] border border-white/70 bg-card/84 p-4 shadow-[0_20px_34px_-32px_rgba(0,0,0,0.45)] backdrop-blur-sm"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/55">{card.label}</p>
            <p className="display-font mt-2 text-2xl font-bold tracking-tight text-foreground">{card.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{card.detail}</p>
          </motion.article>
        ))}
      </section>

      <section className="mx-5 mt-5 rounded-[28px] border border-white/70 bg-card/84 p-4 shadow-[0_24px_40px_-34px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Plan settings</p>
            <h2 className="display-font mt-1 text-xl font-bold tracking-tight text-foreground">Targets that match the goal</h2>
          </div>
          <Target className="h-5 w-5 text-primary" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            `Calorie budget: ${dailyGoal.calories} kcal`,
            `Protein target: ${dailyGoal.protein} g`,
            `Fiber target: ${dailyGoal.fiber} g`,
            `Daily step target: ${dailyGoal.steps.toLocaleString()}`,
            `Current weight: ${latestWeight.toFixed(1)} kg`,
            `Target weight: ${profile.targetWeight} kg`,
          ].map((item) => (
            <div key={item} className="rounded-[22px] bg-secondary/75 px-4 py-3 text-sm font-medium text-foreground">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-5 mt-4 rounded-[28px] border border-white/70 bg-card/84 p-4 shadow-[0_24px_40px_-34px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Preferences</p>
            <h2 className="display-font mt-1 text-xl font-bold tracking-tight text-foreground">What the plan optimises for</h2>
          </div>
          <UtensilsCrossed className="h-5 w-5 text-primary" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.preferences.map((preference) => (
            <span key={preference} className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-foreground">
              {preference}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-5 mt-4 rounded-[28px] border border-white/70 bg-card/84 p-4 shadow-[0_24px_40px_-34px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Routine and reminders</p>
            <h2 className="display-font mt-1 text-xl font-bold tracking-tight text-foreground">Supportive nudges, no guilt</h2>
          </div>
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="mt-4 space-y-3">
          {[
            profile.reminderStatus,
            `Streak protection: ${streak.forgivenessRemaining > 0 ? "one skip still available" : "forgiveness already used"}`,
            `Weight change so far: ${weightLost.toFixed(1)} kg lost`,
          ].map((item) => (
            <div key={item} className="rounded-[22px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-foreground">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-5 mt-4 mb-5 rounded-[28px] border border-white/70 bg-[linear-gradient(145deg,hsl(var(--primary)/0.12),white)] p-4 shadow-[0_24px_40px_-34px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Milestones</p>
            <h2 className="display-font mt-1 text-xl font-bold tracking-tight text-foreground">Small wins worth seeing</h2>
          </div>
          <BadgeCheck className="h-5 w-5 text-primary" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { icon: Flag, title: "Seven day trend", detail: "Weight is down and meal logging stayed consistent." },
            { icon: BadgeCheck, title: "High protein habit", detail: "Favourite foods now bias toward protein-first options." },
            { icon: Settings2, title: "Setup nearly complete", detail: "Only health sync and final reminder tuning are left." },
          ].map((milestone) => (
            <div key={milestone.title} className="rounded-[22px] border border-white/70 bg-card/88 p-4">
              <milestone.icon className="h-4 w-4 text-primary" />
              <p className="mt-3 text-sm font-semibold text-foreground">{milestone.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{milestone.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
