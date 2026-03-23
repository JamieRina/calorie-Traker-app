import { MealLogItem, MealType, useApp } from '@/context/AppContext';
import { Trash2 } from 'lucide-react';

const mealConfig: Record<MealType, { label: string; icon: string }> = {
  breakfast: { label: 'Breakfast', icon: '🌅' },
  lunch: { label: 'Lunch', icon: '☀️' },
  dinner: { label: 'Dinner', icon: '🌙' },
  snack: { label: 'Snack', icon: '🍿' },
};

interface MealCardProps {
  mealType: MealType;
  items: MealLogItem[];
}

export function MealCard({ mealType, items }: MealCardProps) {
  const { removeMealLog } = useApp();
  const config = mealConfig[mealType];
  const totalCals = items.reduce((sum, i) => sum + i.food.calories * i.quantity, 0);

  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <span className="font-semibold text-foreground">{config.label}</span>
        </div>
        <span className="text-sm font-medium text-muted-foreground">{totalCals} kcal</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Nothing logged yet</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm">{item.food.emoji}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.food.name}</p>
                  <p className="text-xs text-muted-foreground">{item.food.servingSize} · {item.food.calories} kcal</p>
                </div>
              </div>
              <button
                onClick={() => removeMealLog(item.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
