import AppLogo from "@/components/AppLogo";
import { CalorieRing } from '@/components/CalorieRing';
import { MacroBar } from '@/components/MacroBar';
import { MealCard } from '@/components/MealCard';
import { useApp, MealType } from '@/context/AppContext';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function Dashboard() {
  const { getDailyTotals, getMealsForDate, dailyGoal } = useApp();
  const totals = getDailyTotals();
  const meals = getMealsForDate();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-2 safe-top">
        <div className="flex items-start gap-3">
          <div className="shrink-0">
            <AppLogo />
          </div>

          <div className="min-w-0 flex-1 pt-1">
            <p className="text-sm text-muted-foreground font-medium">
              {greeting} 👋
            </p>
            <h1 className="text-2xl font-bold text-foreground leading-tight">
              Today&apos;s Summary
            </h1>
          </div>
        </div>
      </div>

      {/* Calorie Ring Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-5 mt-4 bg-card rounded-2xl border p-6"
      >
        <div className="flex items-center justify-center">
          <CalorieRing consumed={totals.calories} goal={dailyGoal.calories} />
        </div>

        <div className="flex items-center justify-center gap-1 mt-3">
          <Flame className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">{totals.calories}</span>
          <span className="text-sm text-muted-foreground">/ {dailyGoal.calories} kcal</span>
        </div>

        {/* Macros */}
        <div className="flex gap-4 mt-5">
          <MacroBar label="Protein" current={totals.protein} goal={dailyGoal.protein} color="hsl(var(--calorie-blue))" />
          <MacroBar label="Carbs" current={totals.carbs} goal={dailyGoal.carbs} color="hsl(var(--calorie-orange))" />
          <MacroBar label="Fat" current={totals.fat} goal={dailyGoal.fat} color="hsl(var(--calorie-purple))" />
        </div>
      </motion.div>

      {/* Meal Sections */}
      <div className="px-5 mt-6 space-y-3">
        <h2 className="text-lg font-bold text-foreground">Meals</h2>
        {mealTypes.map(type => (
          <motion.div
            key={type}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: mealTypes.indexOf(type) * 0.1 }}
          >
            <MealCard
              mealType={type}
              items={meals.filter(m => m.mealType === type)}
            />
          </motion.div>
        ))}
      </div>

      <div className="h-8" />
    </div>
  );
}
