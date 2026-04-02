import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { type DashboardMeal } from "@/lib/api";
import { MealType, MEAL_LABELS } from "@/context/AppContext";

const mealCopy: Record<MealType, string> = {
  breakfast: "Keep breakfast quick and steady.",
  lunch: "Pick one filling midday meal.",
  dinner: "Close the day without overthinking it.",
  snack: "Use snacks to cover genuine gaps.",
};

interface MealCardProps {
  mealType: MealType;
  entries: DashboardMeal[];
  onDelete: (mealId: string) => void;
  isMutating?: boolean;
}

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function MealCard({ mealType, entries, onDelete, isMutating = false }: MealCardProps) {
  const navigate = useNavigate();
  const totalCalories = entries.reduce((sum, item) => sum + item.totalCalories, 0);

  return (
    <section className="rounded-[28px] border border-white/85 bg-white/92 p-4 shadow-[0_18px_36px_-30px_rgba(22,30,43,0.18)] backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">{MEAL_LABELS[mealType]}</p>
          <h3 className="display-font mt-1 text-xl font-bold tracking-tight text-foreground">
            {entries.length === 0 ? "Nothing logged" : `${Math.round(totalCalories)} kcal`}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">{mealCopy[mealType]}</p>
        </div>
        <button
          onClick={() => navigate(`/add?meal=${mealType}`)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_18px_28px_-22px_hsl(var(--primary)/0.55)] transition-transform active:scale-95"
          aria-label={`Add to ${MEAL_LABELS[mealType]}`}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {entries.length === 0 ? (
          <button
            onClick={() => navigate(`/add?meal=${mealType}`)}
            className="flex w-full items-center justify-between rounded-[22px] border border-dashed border-primary/20 bg-secondary/30 px-4 py-4 text-left transition-colors hover:border-primary/35 hover:bg-secondary/45"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">Add food</p>
              <p className="mt-1 text-sm text-muted-foreground">Search, pick, and log in one step.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-primary" />
          </button>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 rounded-[22px] border border-white/80 bg-secondary/25 px-4 py-3">
              <div className="flex h-11 min-w-11 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-primary shadow-sm">
                {Math.round(entry.totalProtein)}P
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {entry.itemCount === 1 ? entry.itemNames[0] : `${entry.itemCount} foods`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatTime(entry.consumedAt)} / {entry.itemNames.slice(0, 2).join(", ")} / {Math.round(entry.totalCalories)} kcal
                </p>
              </div>
              <button
                onClick={() => onDelete(entry.id)}
                disabled={isMutating}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Remove ${entry.itemNames[0] ?? "meal"}`}
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
