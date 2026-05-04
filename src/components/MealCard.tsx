import { Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { type DashboardMeal } from "@/lib/api";
import { MealType, MEAL_LABELS } from "@/context/AppContext";

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
    <section className="rounded-[22px] border border-border/75 bg-card/90 p-3.5 shadow-[var(--shadow-card)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{MEAL_LABELS[mealType]}</p>
          <h3 className="display-font mt-1 text-lg font-bold text-foreground">
            {Math.round(totalCalories)} kcal
          </h3>
          {entries.length > 0 ? <p className="mt-0.5 text-xs text-muted-foreground">{entries.length} logged</p> : null}
        </div>
        <button
          onClick={() => navigate(`/add?meal=${mealType}`)}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-button)] transition-transform active:scale-95"
          aria-label={`Add to ${MEAL_LABELS[mealType]}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {entries.length === 0 ? (
          <button
            onClick={() => navigate(`/add?meal=${mealType}`)}
            className="flex w-full items-center justify-between rounded-[18px] border border-dashed border-primary/25 bg-secondary/20 px-3.5 py-3 text-left transition-colors hover:border-primary/45 hover:bg-secondary/35"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">Add food</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Search and log.</p>
            </div>
            <Plus className="h-4 w-4 text-primary" />
          </button>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 rounded-[18px] bg-surface-elevated/35 px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {entry.itemCount === 1 ? entry.itemNames[0] : `${entry.itemCount} foods`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatTime(entry.consumedAt)} / {Math.round(entry.totalCalories)} kcal
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
