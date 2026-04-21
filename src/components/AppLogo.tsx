import { Flame } from "lucide-react";

export default function AppLogo() {
  return (
    <div className="inline-flex items-center gap-2.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-[17px] bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--primary-soft)))] text-primary-foreground shadow-[var(--shadow-button)]">
        <Flame className="h-[18px] w-[18px]" />
      </div>
      <div>
        <p className="display-font text-base font-bold text-foreground">NutriTrack</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/60">Calories</p>
      </div>
    </div>
  );
}
