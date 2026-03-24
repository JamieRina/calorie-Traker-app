import { Flame, UtensilsCrossed } from "lucide-react";

export default function AppLogo() {
  return (
    <div className="inline-flex items-center gap-3">
      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] shadow-[0_18px_36px_-20px_hsl(var(--primary)/0.85)]">
        <UtensilsCrossed className="h-5 w-5 text-white" />
        <Flame className="absolute -bottom-1 -right-1 h-4 w-4 text-amber-100" />
      </div>
      <div>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.36em] text-primary/60">Nutrition</p>
        <p className="display-font text-lg font-bold tracking-tight text-foreground">NutriTrack</p>
      </div>
    </div>
  );
}
