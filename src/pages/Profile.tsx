import { useApp } from '@/context/AppContext';
import { User, Target, Flame, Award, Settings, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Profile() {
  const { dailyGoal, weightEntries, mealLogs } = useApp();
  const streak = 7; // demo
  const lastWeight = weightEntries[weightEntries.length - 1]?.weight ?? 0;

  const menuItems = [
    { icon: Target, label: 'Daily Goals', detail: `${dailyGoal.calories} kcal` },
    { icon: Flame, label: 'Current Streak', detail: `${streak} days 🔥` },
    { icon: Award, label: 'Achievements', detail: '3 badges' },
    { icon: Settings, label: 'Settings', detail: '' },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      <div className="px-5 pt-6 safe-top">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
      </div>

      {/* Avatar card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-5 mt-5 bg-card rounded-2xl border p-6 flex items-center gap-4"
      >
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Alex Johnson</h2>
          <p className="text-sm text-muted-foreground">Goal: Lose weight · {lastWeight} kg</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">Free Plan</span>
          </div>
        </div>
      </motion.div>

      {/* Quick stats */}
      <div className="flex gap-3 px-5 mt-4">
        {[
          { label: 'Logged Meals', value: mealLogs.length.toString() },
          { label: 'Streak', value: `${streak}d` },
          { label: 'Weight Lost', value: '1.3 kg' },
        ].map(stat => (
          <div key={stat.label} className="flex-1 bg-card rounded-xl border p-3 text-center">
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Menu */}
      <div className="mx-5 mt-6 bg-card rounded-2xl border overflow-hidden">
        {menuItems.map((item, i) => (
          <button
            key={item.label}
            className="flex items-center w-full px-4 py-3.5 hover:bg-secondary/50 transition-colors"
            style={{ borderBottom: i < menuItems.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}
          >
            <item.icon className="w-5 h-5 text-muted-foreground mr-3" />
            <span className="flex-1 text-sm font-medium text-foreground text-left">{item.label}</span>
            {item.detail && <span className="text-xs text-muted-foreground mr-2">{item.detail}</span>}
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      <div className="h-8" />
    </div>
  );
}
