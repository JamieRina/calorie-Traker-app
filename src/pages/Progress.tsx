import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppPage, PageHeader, SectionCard } from "@/components/app/AppPage";
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
        title="Progress"
      />

      <SectionCard variant="hero" eyebrow="Now" title={`${currentWeight.toFixed(1)} kg`} description={`Target ${targetWeight.toFixed(1)} kg`}>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[18px] bg-card/60 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/65">Change</p>
            <p className="display-font mt-1 text-xl font-bold text-foreground">{weightChange.toFixed(1)} kg</p>
          </div>
          <div className="rounded-[18px] bg-card/60 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/65">Goal</p>
            <p className="display-font mt-1 text-xl font-bold text-foreground">{goal?.calories ?? 2200} kcal</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Weight" title="Trend">
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
              <Tooltip
                cursor={{ stroke: "hsl(var(--primary))", strokeOpacity: 0.28 }}
                contentStyle={{ borderRadius: 18, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
              />
              <Area type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#weightFill)" dot={{ r: 3, fill: "hsl(var(--primary))" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Calories" title="This week">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dashboardQuery.data?.weeklyTrend ?? []}>
              <CartesianGrid stroke="hsl(var(--border))" vertical={false} strokeDasharray="4 4" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={42} />
              <Tooltip
                cursor={{ fill: "hsl(var(--primary) / 0.12)" }}
                contentStyle={{ borderRadius: 18, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
              />
              <Bar dataKey="calories" fill="hsl(var(--carbs))" radius={[10, 10, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {uiMode === "advanced" ? (
        <SectionCard eyebrow="Advanced" title="Entries">
          <div className="space-y-2.5">
            {progressEntries.slice(0, 6).map((entry) => (
              <div key={entry.id} className="rounded-[18px] bg-surface-elevated/35 px-3.5 py-3">
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
