import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDown, Flame, Scale, Trophy } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function Progress() {
  const { dailyGoal, getStreakInfo, getWeeklyNutrition, profile, weightEntries } = useApp();
  const streak = getStreakInfo();
  const weeklyNutrition = getWeeklyNutrition(7);
  const weightData = weightEntries.map((entry) => ({
    label: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(`${entry.date}T12:00:00`)),
    weight: entry.weight,
  }));
  const currentWeight = weightEntries[weightEntries.length - 1]?.weight ?? profile.currentWeight;
  const startingWeight = weightEntries[0]?.weight ?? currentWeight;
  const weightDelta = Number((currentWeight - startingWeight).toFixed(1));
  const averageCalories = Math.round(weeklyNutrition.reduce((sum, point) => sum + point.calories, 0) / weeklyNutrition.length);
  const averageBurn = Math.round(weeklyNutrition.reduce((sum, point) => sum + point.burn, 0) / weeklyNutrition.length);
  const balanceDay = weeklyNutrition.reduce((best, point) => {
    if (!best) return point;
    return Math.abs(point.remainingBudget) < Math.abs(best.remainingBudget) ? point : best;
  }, weeklyNutrition[0]);

  return (
    <div className="flex h-full flex-col overflow-y-auto pb-28">
      <div className="px-5 pt-6 safe-top">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Trend lines</p>
        <h1 className="display-font mt-2 text-[2rem] font-bold leading-none tracking-tight text-foreground">Progress that feels usable</h1>
        <p className="mt-3 text-sm text-muted-foreground">Weekly weight, calorie adherence, and macro balance in one place.</p>
      </div>

      <section className="mt-5 grid gap-3 px-5 sm:grid-cols-3">
        {[
          { icon: Scale, label: "Current", value: `${currentWeight.toFixed(1)} kg`, detail: `Target ${dailyGoal.targetWeight} kg` },
          { icon: ArrowDown, label: "Change", value: `${weightDelta.toFixed(1)} kg`, detail: weightDelta <= 0 ? "Moving down" : "Above start" },
          { icon: Trophy, label: "Streak", value: `${streak.count} days`, detail: `${streak.forgivenessRemaining} skip left` },
        ].map((card, index) => (
          <motion.article
            key={card.label}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 + (index * 0.05) }}
            className="rounded-[26px] border border-white/70 bg-card/84 p-4 shadow-[0_20px_34px_-32px_rgba(0,0,0,0.45)] backdrop-blur-sm"
          >
            <card.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/55">{card.label}</p>
            <p className="display-font mt-2 text-2xl font-bold tracking-tight text-foreground">{card.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{card.detail}</p>
          </motion.article>
        ))}
      </section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="mx-5 mt-5 rounded-[28px] border border-white/70 bg-card/84 p-4 shadow-[0_24px_40px_-34px_rgba(0,0,0,0.45)] backdrop-blur-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Weight trend</p>
            <h2 className="display-font mt-1 text-xl font-bold tracking-tight text-foreground">Scale noise, smoothed visually</h2>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">7 day view</span>
        </div>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weightData}>
              <defs>
                <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" vertical={false} strokeDasharray="4 4" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={38} domain={["dataMin - 0.4", "dataMax + 0.4"]} />
              <Tooltip
                cursor={{ stroke: "hsl(var(--border))" }}
                contentStyle={{ borderRadius: 18, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
              />
              <Area type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#weightFill)" dot={{ r: 3, fill: "hsl(var(--primary))" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="mx-5 mt-4 rounded-[28px] border border-white/70 bg-card/84 p-4 shadow-[0_24px_40px_-34px_rgba(0,0,0,0.45)] backdrop-blur-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Calorie adherence</p>
            <h2 className="display-font mt-1 text-xl font-bold tracking-tight text-foreground">Bars show intake, line tracks your active budget</h2>
          </div>
          <div className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">Goal {dailyGoal.calories} kcal</div>
        </div>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={weeklyNutrition}>
              <CartesianGrid stroke="hsl(var(--border))" vertical={false} strokeDasharray="4 4" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={44} />
              <Tooltip
                cursor={{ fill: "hsl(var(--secondary) / 0.4)" }}
                contentStyle={{ borderRadius: 18, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
              />
              <Bar dataKey="calories" radius={[10, 10, 0, 0]} fill="hsl(var(--accent))" barSize={26} />
              <Line type="monotone" dataKey="adjustedBudget" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 3, fill: "hsl(var(--primary))" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="mx-5 mt-4 rounded-[28px] border border-white/70 bg-card/84 p-4 shadow-[0_24px_40px_-34px_rgba(0,0,0,0.45)] backdrop-blur-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Macro trend</p>
            <h2 className="display-font mt-1 text-xl font-bold tracking-tight text-foreground">Protein, carbs, and fats across the week</h2>
          </div>
          <Flame className="h-5 w-5 text-primary" />
        </div>
        <div className="mt-4 h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyNutrition}>
              <defs>
                <linearGradient id="proteinGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="carbGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="fatGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.08} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" vertical={false} strokeDasharray="4 4" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={38} />
              <Tooltip
                cursor={{ stroke: "hsl(var(--border))" }}
                contentStyle={{ borderRadius: 18, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
              />
              <Area type="monotone" dataKey="protein" stackId="1" stroke="hsl(var(--primary))" fill="url(#proteinGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="carbs" stackId="1" stroke="hsl(var(--accent))" fill="url(#carbGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="fat" stackId="1" stroke="hsl(var(--chart-2))" fill="url(#fatGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      <section className="mx-5 mt-4 mb-5 rounded-[28px] border border-white/70 bg-[linear-gradient(145deg,hsl(var(--primary)/0.12),white)] p-4 shadow-[0_24px_40px_-34px_rgba(0,0,0,0.45)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Weekly summary</p>
        <p className="mt-3 text-sm leading-6 text-foreground">
          You averaged {averageCalories} kcal eaten and {averageBurn} kcal burned per day this week. Your most balanced day was {balanceDay.label}, where intake landed closest to the active budget.
        </p>
      </section>
    </div>
  );
}
