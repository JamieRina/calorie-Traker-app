import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MealLogItem, MealType, MEAL_LABELS, useApp } from "@/context/AppContext";

const mealCopy: Record<MealType, { subtitle: string; accent: string }> = {
  breakfast: { subtitle: "Start strong and keep the morning simple.", accent: "from-amber-100 via-white to-amber-50" },
  lunch: { subtitle: "Aim for the fastest high-protein win.", accent: "from-emerald-100 via-white to-teal-50" },
  dinner: { subtitle: "Close the day without guessing portions.", accent: "from-sky-100 via-white to-cyan-50" },
  snack: { subtitle: "Use snacks to close nutrient gaps.", accent: "from-rose-100 via-white to-orange-50" },
};

interface MealCardProps {
  mealType: MealType;
  items: MealLogItem[];
}

export function MealCard({ mealType, items }: MealCardProps) {
  const navigate = useNavigate();
  const { removeMealLog } = useApp();
  const totalCalories = items.reduce((sum, item) => sum + (item.food.calories * item.quantity), 0);
  const copy = mealCopy[mealType];

  return (
    <section className={`rounded-[28px] border border-white/70 bg-gradient-to-br ${copy.accent} p-4 shadow-[0_24px_40px_-34px_rgba(0,0,0,0.45)]`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">{MEAL_LABELS[mealType]}</p>
          <h3 className="display-font mt-1 text-xl font-bold tracking-tight text-foreground">{Math.round(totalCalories)} kcal logged</h3>
          <p className="mt-1 max-w-[26ch] text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
        <button
          onClick={() => navigate(`/add?meal=${mealType}`)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground text-background shadow-[0_18px_30px_-24px_rgba(0,0,0,0.8)] transition-transform active:scale-95"
          aria-label={`Add to ${MEAL_LABELS[mealType]}`}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <button
            onClick={() => navigate(`/add?meal=${mealType}`)}
            className="flex w-full items-center justify-between rounded-2xl border border-dashed border-primary/25 bg-white/70 px-4 py-4 text-left transition-colors hover:border-primary/40 hover:bg-white"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">Nothing logged yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Tap to add a quick favourite, scan a barcode, or paste a recipe.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-primary" />
          </button>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/82 px-4 py-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-sm font-semibold text-primary">
                {Math.round(item.food.protein)}P
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{item.food.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.quantity} x {item.food.servingSize}  |  {Math.round(item.food.calories * item.quantity)} kcal
                </p>
              </div>
              <button
                onClick={() => removeMealLog(item.id)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Remove ${item.food.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
