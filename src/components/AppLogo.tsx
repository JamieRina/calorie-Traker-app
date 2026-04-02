import { Flame } from "lucide-react";

export default function AppLogo() {
  return (
    <div className="inline-flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-white shadow-[0_18px_28px_-18px_hsl(var(--primary)/0.7)]">
        <Flame className="h-5 w-5" />
      </div>
      <div>
        <p className="display-font text-lg font-bold tracking-tight text-foreground">NutriTrack</p>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary/55">Calmer tracking</p>
      </div>
    </div>
  );
}
