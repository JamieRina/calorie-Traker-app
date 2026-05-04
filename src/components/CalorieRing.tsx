import { motion } from "framer-motion";

interface CalorieRingProps {
  consumed: number;
  goal: number;
  size?: number;
}

export function CalorieRing({ consumed, goal, size = 180 }: CalorieRingProps) {
  const safeGoal = Math.max(goal, 1);
  const percentage = Math.min((consumed / safeGoal) * 100, 100);
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const stroke = percentage > 95 ? "hsl(var(--fat))" : "hsl(var(--primary))";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 drop-shadow-[0_16px_28px_hsl(var(--primary)/0.24)]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex h-[72%] w-[72%] flex-col items-center justify-center rounded-full border border-border/70 bg-card shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06),0_18px_32px_-24px_rgb(0_0_0/0.5)]">
        <span className="display-font text-3xl font-bold text-foreground">{Math.round(consumed)}</span>
        <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">logged</span>
        <span className="mt-2 text-xs text-muted-foreground">{goal} goal</span>
      </div>
    </div>
  );
}
