import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, FOOD_DATABASE, MealType, Food } from '@/context/AppContext';
import { Input } from '@/components/ui/input';
import { Search, Heart, Clock, ArrowLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const mealTypes: { value: MealType; label: string; icon: string }[] = [
  { value: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { value: 'lunch', label: 'Lunch', icon: '☀️' },
  { value: 'dinner', label: 'Dinner', icon: '🌙' },
  { value: 'snack', label: 'Snack', icon: '🍿' },
];

type Tab = 'all' | 'favourites' | 'recent';

export default function AddMeal() {
  const navigate = useNavigate();
  const { addMealLog, favouriteFoodIds, toggleFavourite, mealLogs } = useApp();
  const [search, setSearch] = useState('');
  const [selectedMeal, setSelectedMeal] = useState<MealType>('lunch');
  const [tab, setTab] = useState<Tab>('all');
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const recentFoodIds = useMemo(() => {
    const seen = new Set<string>();
    return mealLogs
      .slice()
      .reverse()
      .filter(log => {
        if (seen.has(log.food.id)) return false;
        seen.add(log.food.id);
        return true;
      })
      .slice(0, 10)
      .map(l => l.food.id);
  }, [mealLogs]);

  const filteredFoods = useMemo(() => {
    let foods = FOOD_DATABASE;
    if (tab === 'favourites') foods = foods.filter(f => favouriteFoodIds.includes(f.id));
    if (tab === 'recent') foods = foods.filter(f => recentFoodIds.includes(f.id));
    if (search.trim()) {
      const q = search.toLowerCase();
      foods = foods.filter(f => f.name.toLowerCase().includes(q));
    }
    return foods;
  }, [search, tab, favouriteFoodIds, recentFoodIds]);

  const handleAdd = (food: Food) => {
    addMealLog({ food, quantity: 1, mealType: selectedMeal });
    setJustAdded(food.id);
    setTimeout(() => setJustAdded(null), 1200);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 safe-top">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/')} className="p-1 rounded-lg hover:bg-secondary">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Log Food</h1>
        </div>

        {/* Meal type chips */}
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
          {mealTypes.map(m => (
            <button
              key={m.value}
              onClick={() => setSelectedMeal(m.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                selectedMeal === m.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              )}
            >
              <span>{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search foods..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-secondary border-0 rounded-xl h-11"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3 bg-secondary rounded-xl p-1">
          {([['all', 'All Foods'], ['favourites', 'Favourites'], ['recent', 'Recent']] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex-1 py-2 text-xs font-semibold rounded-lg transition-colors',
                tab === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Food list */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        <AnimatePresence>
          {filteredFoods.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Search className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">No foods found</p>
            </div>
          ) : (
            filteredFoods.map(food => (
              <motion.div
                key={food.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 py-3 border-b last:border-0"
              >
                <span className="text-2xl w-10 text-center">{food.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{food.name}</p>
                  <p className="text-xs text-muted-foreground">{food.servingSize} · {food.calories} kcal</p>
                  <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                    <span>P {food.protein}g</span>
                    <span>C {food.carbs}g</span>
                    <span>F {food.fat}g</span>
                  </div>
                </div>
                <button
                  onClick={() => toggleFavourite(food.id)}
                  className="p-1.5"
                >
                  <Heart className={cn('w-4 h-4', favouriteFoodIds.includes(food.id) ? 'fill-destructive text-destructive' : 'text-muted-foreground')} />
                </button>
                <button
                  onClick={() => handleAdd(food)}
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                    justAdded === food.id
                      ? 'bg-primary text-primary-foreground scale-110'
                      : 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground'
                  )}
                >
                  {justAdded === food.id ? <Check className="w-4 h-4" /> : <span className="text-lg font-light">+</span>}
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
