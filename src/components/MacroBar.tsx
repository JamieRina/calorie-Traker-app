import { motion } from "framer-motion";

interface MacroBarProps {
  label: string;
  current: number;
  goal: number;
  color: string;
  unit?: string;
}

export function MacroBar({ label, current, goal, color, unit = "g" }: MacroBarProps) {
  const safeGoal = Math.max(goal, 1);
  const percentage = Math.min((current / safeGoal) * 100, 100);

  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 p-3 shadow-[0_18px_32px_-28px_rgba(0,0,0,0.45)] backdrop-blur-sm">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</span>
        <span className="display-font text-sm font-bold text-foreground">
          {Math.round(current)}/{goal}
          {unit}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.75, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
