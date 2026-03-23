import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  emoji?: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealLogItem {
  id: string;
  food: Food;
  quantity: number;
  mealType: MealType;
  loggedAt: string; // ISO date
}

export interface DailyGoal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface WeightEntry {
  date: string;
  weight: number;
}

interface AppState {
  mealLogs: MealLogItem[];
  dailyGoal: DailyGoal;
  weightEntries: WeightEntry[];
  favouriteFoodIds: string[];
  currentDate: string;
}

interface AppContextType extends AppState {
  addMealLog: (item: Omit<MealLogItem, 'id' | 'loggedAt'>) => void;
  removeMealLog: (id: string) => void;
  toggleFavourite: (foodId: string) => void;
  addWeightEntry: (entry: WeightEntry) => void;
  setCurrentDate: (date: string) => void;
  getDailyTotals: (date?: string) => { calories: number; protein: number; carbs: number; fat: number };
  getMealsForDate: (date?: string) => MealLogItem[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const today = new Date().toISOString().split('T')[0];

// Sample foods
export const FOOD_DATABASE: Food[] = [
  { id: '1', name: 'Scrambled Eggs', calories: 182, protein: 13, carbs: 2, fat: 14, servingSize: '2 eggs', emoji: '🥚' },
  { id: '2', name: 'Oatmeal with Berries', calories: 245, protein: 8, carbs: 42, fat: 5, servingSize: '1 bowl', emoji: '🥣' },
  { id: '3', name: 'Grilled Chicken Breast', calories: 284, protein: 53, carbs: 0, fat: 6, servingSize: '200g', emoji: '🍗' },
  { id: '4', name: 'Brown Rice', calories: 216, protein: 5, carbs: 45, fat: 2, servingSize: '1 cup', emoji: '🍚' },
  { id: '5', name: 'Greek Yoghurt', calories: 130, protein: 17, carbs: 6, fat: 4, servingSize: '170g', emoji: '🥛' },
  { id: '6', name: 'Avocado Toast', calories: 320, protein: 8, carbs: 28, fat: 20, servingSize: '1 slice', emoji: '🥑' },
  { id: '7', name: 'Salmon Fillet', calories: 367, protein: 34, carbs: 0, fat: 22, servingSize: '200g', emoji: '🐟' },
  { id: '8', name: 'Mixed Salad', calories: 120, protein: 4, carbs: 14, fat: 6, servingSize: '1 bowl', emoji: '🥗' },
  { id: '9', name: 'Banana', calories: 105, protein: 1, carbs: 27, fat: 0, servingSize: '1 medium', emoji: '🍌' },
  { id: '10', name: 'Protein Shake', calories: 220, protein: 30, carbs: 12, fat: 4, servingSize: '1 scoop + milk', emoji: '🥤' },
  { id: '11', name: 'Almonds', calories: 164, protein: 6, carbs: 6, fat: 14, servingSize: '28g', emoji: '🥜' },
  { id: '12', name: 'Sweet Potato', calories: 180, protein: 4, carbs: 41, fat: 0, servingSize: '1 medium', emoji: '🍠' },
  { id: '13', name: 'Pasta Bolognese', calories: 485, protein: 22, carbs: 58, fat: 16, servingSize: '1 plate', emoji: '🍝' },
  { id: '14', name: 'Apple', calories: 95, protein: 0, carbs: 25, fat: 0, servingSize: '1 medium', emoji: '🍎' },
  { id: '15', name: 'Chicken Wrap', calories: 380, protein: 28, carbs: 35, fat: 12, servingSize: '1 wrap', emoji: '🌯' },
  { id: '16', name: 'Peanut Butter Toast', calories: 267, protein: 10, carbs: 24, fat: 16, servingSize: '1 slice', emoji: '🥜' },
  { id: '17', name: 'Steak', calories: 450, protein: 42, carbs: 0, fat: 30, servingSize: '250g', emoji: '🥩' },
  { id: '18', name: 'Broccoli', calories: 55, protein: 4, carbs: 11, fat: 0, servingSize: '1 cup', emoji: '🥦' },
  { id: '19', name: 'Coffee with Milk', calories: 45, protein: 2, carbs: 5, fat: 2, servingSize: '1 cup', emoji: '☕' },
  { id: '20', name: 'Dark Chocolate', calories: 170, protein: 2, carbs: 13, fat: 12, servingSize: '30g', emoji: '🍫' },
];

// Pre-populated demo data
const demoLogs: MealLogItem[] = [
  { id: 'demo1', food: FOOD_DATABASE[0], quantity: 1, mealType: 'breakfast', loggedAt: today },
  { id: 'demo2', food: FOOD_DATABASE[4], quantity: 1, mealType: 'breakfast', loggedAt: today },
  { id: 'demo3', food: FOOD_DATABASE[2], quantity: 1, mealType: 'lunch', loggedAt: today },
  { id: 'demo4', food: FOOD_DATABASE[3], quantity: 1, mealType: 'lunch', loggedAt: today },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [mealLogs, setMealLogs] = useState<MealLogItem[]>(demoLogs);
  const [dailyGoal] = useState<DailyGoal>({ calories: 2200, protein: 150, carbs: 250, fat: 70 });
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([
    { date: '2026-03-17', weight: 82.5 },
    { date: '2026-03-18', weight: 82.3 },
    { date: '2026-03-19', weight: 82.0 },
    { date: '2026-03-20', weight: 81.8 },
    { date: '2026-03-21', weight: 81.9 },
    { date: '2026-03-22', weight: 81.5 },
    { date: '2026-03-23', weight: 81.2 },
  ]);
  const [favouriteFoodIds, setFavouriteFoodIds] = useState<string[]>(['3', '5', '10']);
  const [currentDate, setCurrentDate] = useState(today);

  const addMealLog = useCallback((item: Omit<MealLogItem, 'id' | 'loggedAt'>) => {
    setMealLogs(prev => [...prev, {
      ...item,
      id: crypto.randomUUID(),
      loggedAt: currentDate,
    }]);
  }, [currentDate]);

  const removeMealLog = useCallback((id: string) => {
    setMealLogs(prev => prev.filter(log => log.id !== id));
  }, []);

  const toggleFavourite = useCallback((foodId: string) => {
    setFavouriteFoodIds(prev =>
      prev.includes(foodId) ? prev.filter(id => id !== foodId) : [...prev, foodId]
    );
  }, []);

  const addWeightEntry = useCallback((entry: WeightEntry) => {
    setWeightEntries(prev => [...prev.filter(e => e.date !== entry.date), entry].sort((a, b) => a.date.localeCompare(b.date)));
  }, []);

  const getMealsForDate = useCallback((date?: string) => {
    const d = date || currentDate;
    return mealLogs.filter(log => log.loggedAt === d);
  }, [mealLogs, currentDate]);

  const getDailyTotals = useCallback((date?: string) => {
    const meals = getMealsForDate(date);
    return meals.reduce((acc, log) => ({
      calories: acc.calories + log.food.calories * log.quantity,
      protein: acc.protein + log.food.protein * log.quantity,
      carbs: acc.carbs + log.food.carbs * log.quantity,
      fat: acc.fat + log.food.fat * log.quantity,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [getMealsForDate]);

  return (
    <AppContext.Provider value={{
      mealLogs, dailyGoal, weightEntries, favouriteFoodIds, currentDate,
      addMealLog, removeMealLog, toggleFavourite, addWeightEntry, setCurrentDate,
      getDailyTotals, getMealsForDate,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
