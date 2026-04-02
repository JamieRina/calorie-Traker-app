import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, Flame, Scale } from "lucide-react";
import { AppPage, MetricCard, PageHeader, SectionCard } from "@/components/app/AppPage";
import { getDashboard, getProfileSummary, listProgressEntries } from "@/lib/api";
import { useApp } from "@/context/AppContext";

function formatDay(dateKey: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(`${dateKey}T12:00:00`));
}

export default function Progress() {
  const { currentDate, uiMode, isBackendReady } = useApp();

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", currentDate],
    queryFn: () => getDashboard(currentDate),
    enabled: isBackendReady,
  });

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: getProfileSummary,
    enabled: isBackendReady,
  });

  const progressQuery = useQuery({
    queryKey: ["progress"],
    queryFn: listProgressEntries,
    enabled: isBackendReady,
  });

  const profile = profileQuery.data?.profile;
  const goal = profileQuery.data?.dailyGoal;
  const progressEntries = progressQuery.data ?? [];
  const currentWeight = progressEntries[0]?.weightKg ?? profile?.currentWeight ?? 0;
  const targetWeight = goal?.targetWeight ?? profile?.targetWeight ?? currentWeight;
  const firstWeight = progressEntries[progressEntries.length - 1]?.weightKg ?? currentWeight;
  const weightChange = Number((currentWeight - firstWeight).toFixed(1));

  const weightData =
    progressEntries.length > 0
      ? progressEntries
          .filter((entry) => typeof entry.weightKg === "number")
          .slice()
          .reverse()
          .map((entry) => ({
            label: formatDay(entry.recordedAt.slice(0, 10)),
            weight: entry.weightKg,
          }))
      : [{ label: "Today", weight: currentWeight }];

  return (
    <AppPage>
      <PageHeader
        eyebrow="Progress"
        title="Just the trend you need"
        description="The default view keeps progress light: current weight, direction, and weekly calories."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard icon={Scale} label="Current" value={`${currentWeight.toFixed(1)} kg`} detail={`Target ${targetWeight.toFixed(1)} kg`} />
        <MetricCard icon={ArrowDown} label="Change" value={`${weightChange.toFixed(1)} kg`} detail={weightChange <= 0 ? "Below your earliest check-in" : "Above your earliest check-in"} />
        <MetricCard icon={Flame} label="Goal" value={`${goal?.calories ?? 2200} kcal`} detail="Current daily calorie target" tone="accent" />
      </div>

      <SectionCard eyebrow="Weight" title="Your recent check-ins" description="Enough detail to show direction without turning the screen into a report.">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weightData}>
              <defs>
                <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.38} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" vertical={false} strokeDasharray="4 4" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={38} />
              <Tooltip cursor={{ stroke: "hsl(var(--border))" }} contentStyle={{ borderRadius: 18, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Area type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#weightFill)" dot={{ r: 3, fill: "hsl(var(--primary))" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Calories" title="This week at a glance" description="A quick check that your intake is trending where you expect.">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dashboardQuery.data?.weeklyTrend ?? []}>
              <CartesianGrid stroke="hsl(var(--border))" vertical={false} strokeDasharray="4 4" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={42} />
              <Tooltip cursor={{ fill: "hsl(var(--secondary) / 0.35)" }} contentStyle={{ borderRadius: 18, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Bar dataKey="calories" fill="hsl(var(--accent))" radius={[10, 10, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {uiMode === "advanced" ? (
        <SectionCard eyebrow="Advanced" title="Recent entries" description="Extra notes and check-ins stay behind advanced mode.">
          <div className="space-y-3">
            {progressEntries.slice(0, 6).map((entry) => (
              <div key={entry.id} className="rounded-[22px] border border-white/80 bg-secondary/25 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">
                    {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(entry.recordedAt))}
                  </p>
                  {typeof entry.weightKg === "number" ? <p className="text-sm font-semibold text-foreground">{entry.weightKg.toFixed(1)} kg</p> : null}
                </div>
                {entry.note ? <p className="mt-2 text-sm text-muted-foreground">{entry.note}</p> : null}
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </AppPage>
  );
}
