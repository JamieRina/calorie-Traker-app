import { useApp } from '@/context/AppContext';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart } from 'recharts';
import { TrendingDown, Scale, Target } from 'lucide-react';

export default function Progress() {
  const { weightEntries, getDailyTotals } = useApp();

  const weightData = weightEntries.map(e => ({
    date: e.date.slice(5),
    weight: e.weight,
  }));

  const first = weightEntries[0]?.weight ?? 0;
  const last = weightEntries[weightEntries.length - 1]?.weight ?? 0;
  const diff = (last - first).toFixed(1);

  // Build last 7 days calorie data
  const calorieData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const totals = getDailyTotals(dateStr);
    return { date: dateStr.slice(5), calories: totals.calories };
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      <div className="px-5 pt-6 safe-top">
        <h1 className="text-2xl font-bold text-foreground">Progress</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your journey</p>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 px-5 mt-5">
        {[
          { icon: Scale, label: 'Current', value: `${last} kg`, color: 'text-cal-blue' },
          { icon: TrendingDown, label: 'Change', value: `${diff} kg`, color: Number(diff) <= 0 ? 'text-cal-green' : 'text-cal-red' },
          { icon: Target, label: 'Goal', value: '78 kg', color: 'text-cal-purple' },
        ].map(stat => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 bg-card rounded-xl border p-3 text-center"
          >
            <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Weight chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mx-5 mt-6 bg-card rounded-2xl border p-4"
      >
        <h2 className="text-sm font-semibold text-foreground mb-3">Weight Trend</h2>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={weightData}>
            <defs>
              <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
            <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={35} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
            />
            <Area type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#weightGrad)" dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Calorie chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mx-5 mt-4 bg-card rounded-2xl border p-4"
      >
        <h2 className="text-sm font-semibold text-foreground mb-3">Calorie History (7 days)</h2>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={calorieData}>
            <defs>
              <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--calorie-orange))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--calorie-orange))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={35} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
            />
            <Area type="monotone" dataKey="calories" stroke="hsl(var(--calorie-orange))" strokeWidth={2.5} fill="url(#calGrad)" dot={{ r: 3, fill: 'hsl(var(--calorie-orange))' }} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      <div className="h-8" />
    </div>
  );
}
