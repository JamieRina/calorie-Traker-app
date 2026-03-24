import React, { createContext, useCallback, useContext, useState } from "react";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface Nutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  iron: number;
  vitaminC: number;
}

export interface Food extends Nutrients {
  id: string;
  name: string;
  servingSize: string;
  source: "Verified" | "Recipe" | "Community";
  brand?: string;
  mealHints: MealType[];
}

export interface MealLogItem {
  id: string;
  food: Food;
  quantity: number;
  mealType: MealType;
  loggedAt: string;
}

export interface DailyGoal extends Nutrients {
  steps: number;
  targetWeight: number;
}

export interface WeightEntry {
  date: string;
  weight: number;
}

export interface WorkoutLog {
  id: string;
  type: string;
  durationMinutes: number;
  caloriesBurned: number;
  intensity: "Low" | "Moderate" | "High";
  loggedAt: string;
}

export interface StepEntry {
  date: string;
  steps: number;
  caloriesBurned: number;
  distanceKm: number;
  activeMinutes: number;
  routeName?: string;
}

export interface RouteRecommendation {
  id: string;
  name: string;
  location: string;
  distanceKm: number;
  estimatedBurn: number;
  terrain: string;
}

export interface UserProfile {
  name: string;
  goal: "Lose weight" | "Maintain" | "Gain muscle";
  age: number;
  heightCm: number;
  currentWeight: number;
  targetWeight: number;
  activityLevel: string;
  preferences: string[];
  onboardingCompletion: number;
  reminderStatus: string;
}

export interface NutrientGap {
  key: "protein" | "fiber" | "iron" | "vitaminC";
  label: string;
  unit: string;
  current: number;
  goal: number;
  remaining: number;
}

interface AppState {
  mealLogs: MealLogItem[];
  dailyGoal: DailyGoal;
  weightEntries: WeightEntry[];
  favouriteFoodIds: string[];
  currentDate: string;
  workoutLogs: WorkoutLog[];
  stepEntries: StepEntry[];
  profile: UserProfile;
  routeLibrary: RouteRecommendation[];
}

interface DailyActivitySummary {
  steps: number;
  stepBurn: number;
  workoutBurn: number;
  totalBurn: number;
  activeMinutes: number;
  distanceKm: number;
  routeName: string | null;
  workouts: WorkoutLog[];
  adjustedBudget: number;
  remainingBudget: number;
  netCalories: number;
}

interface WeeklyNutritionPoint {
  date: string;
  label: string;
  calories: number;
  goal: number;
  adjustedBudget: number;
  remainingBudget: number;
  burn: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface StreakInfo {
  count: number;
  forgivenessRemaining: number;
}

interface AppContextType extends AppState {
  addMealLog: (item: Omit<MealLogItem, "id" | "loggedAt">) => void;
  removeMealLog: (id: string) => void;
  toggleFavourite: (foodId: string) => void;
  addWeightEntry: (entry: WeightEntry) => void;
  addWorkout: (workout: Omit<WorkoutLog, "id" | "loggedAt"> & { loggedAt?: string }) => void;
  setCurrentDate: (date: string) => void;
  getDailyTotals: (date?: string) => Nutrients;
  getMealsForDate: (date?: string) => MealLogItem[];
  getMealsByType: (mealType: MealType, date?: string) => MealLogItem[];
  getDailyActivity: (date?: string) => DailyActivitySummary;
  getRecentFoods: () => Food[];
  getFavouriteFoods: () => Food[];
  getStreakInfo: (date?: string) => StreakInfo;
  getNutrientGaps: (date?: string) => NutrientGap[];
  getSmartSuggestions: (date?: string) => Food[];
  getWeeklyNutrition: (days?: number, anchorDate?: string) => WeeklyNutritionPoint[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const nutrientKeys = ["calories", "protein", "carbs", "fat", "fiber", "iron", "vitaminC"] as const;

function createEmptyNutrition(): Nutrients {
  return {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    iron: 0,
    vitaminC: 0,
  };
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function shiftDateKey(dateKey: string, amount: number) {
  const next = parseDateKey(dateKey);
  next.setDate(next.getDate() + amount);
  return formatDateKey(next);
}

export function formatShortDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-GB", { month: "short", day: "numeric" }).format(parseDateKey(dateKey));
}

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export const WORKOUT_PRESETS: Array<Omit<WorkoutLog, "id" | "loggedAt">> = [
  { type: "Strength circuit", durationMinutes: 45, caloriesBurned: 280, intensity: "Moderate" },
  { type: "Incline walk", durationMinutes: 25, caloriesBurned: 180, intensity: "Low" },
  { type: "Tempo run", durationMinutes: 35, caloriesBurned: 320, intensity: "High" },
  { type: "Mobility and core", durationMinutes: 20, caloriesBurned: 95, intensity: "Low" },
];

export const ROUTE_LIBRARY: RouteRecommendation[] = [
  {
    id: "route-1",
    name: "Canal reset loop",
    location: "Regent's Canal",
    distanceKm: 4.8,
    estimatedBurn: 240,
    terrain: "Flat city walk",
  },
  {
    id: "route-2",
    name: "Park strides",
    location: "Victoria Park",
    distanceKm: 6.1,
    estimatedBurn: 310,
    terrain: "Mixed pace paths",
  },
  {
    id: "route-3",
    name: "Lunch hour lap",
    location: "Local high street",
    distanceKm: 3.2,
    estimatedBurn: 155,
    terrain: "Quick urban walk",
  },
];

export const FOOD_DATABASE: Food[] = [
  {
    id: "food-1",
    name: "Overnight oats with berries",
    servingSize: "1 jar",
    source: "Recipe",
    mealHints: ["breakfast"],
    calories: 290,
    protein: 14,
    carbs: 42,
    fat: 8,
    fiber: 8,
    iron: 2.2,
    vitaminC: 18,
  },
  {
    id: "food-2",
    name: "Greek yoghurt pot",
    servingSize: "170 g",
    source: "Verified",
    brand: "Fage",
    mealHints: ["breakfast", "snack"],
    calories: 130,
    protein: 17,
    carbs: 6,
    fat: 4,
    fiber: 0,
    iron: 0.1,
    vitaminC: 0,
  },
  {
    id: "food-3",
    name: "Chicken shawarma bowl",
    servingSize: "1 bowl",
    source: "Recipe",
    mealHints: ["lunch", "dinner"],
    calories: 560,
    protein: 46,
    carbs: 52,
    fat: 18,
    fiber: 7,
    iron: 3.2,
    vitaminC: 24,
  },
  {
    id: "food-4",
    name: "Grilled salmon rice bowl",
    servingSize: "1 bowl",
    source: "Recipe",
    mealHints: ["lunch", "dinner"],
    calories: 610,
    protein: 38,
    carbs: 48,
    fat: 24,
    fiber: 6,
    iron: 2.1,
    vitaminC: 14,
  },
  {
    id: "food-5",
    name: "Lentil soup",
    servingSize: "1 large bowl",
    source: "Recipe",
    mealHints: ["lunch", "dinner"],
    calories: 320,
    protein: 21,
    carbs: 42,
    fat: 6,
    fiber: 14,
    iron: 6.1,
    vitaminC: 10,
  },
  {
    id: "food-6",
    name: "Chicken wrap",
    servingSize: "1 wrap",
    source: "Verified",
    mealHints: ["lunch"],
    calories: 380,
    protein: 28,
    carbs: 35,
    fat: 12,
    fiber: 5,
    iron: 2.1,
    vitaminC: 10,
  },
  {
    id: "food-7",
    name: "Protein shake",
    servingSize: "1 bottle",
    source: "Verified",
    brand: "Barebells",
    mealHints: ["snack"],
    calories: 220,
    protein: 30,
    carbs: 12,
    fat: 4,
    fiber: 1,
    iron: 1,
    vitaminC: 0,
  },
  {
    id: "food-8",
    name: "Apple",
    servingSize: "1 medium",
    source: "Verified",
    mealHints: ["snack"],
    calories: 95,
    protein: 0.5,
    carbs: 25,
    fat: 0.3,
    fiber: 4.4,
    iron: 0.1,
    vitaminC: 8,
  },
  {
    id: "food-9",
    name: "Orange",
    servingSize: "1 medium",
    source: "Verified",
    mealHints: ["snack"],
    calories: 86,
    protein: 1.7,
    carbs: 21,
    fat: 0.2,
    fiber: 4,
    iron: 0.1,
    vitaminC: 70,
  },
  {
    id: "food-10",
    name: "Eggs on sourdough",
    servingSize: "2 eggs on toast",
    source: "Recipe",
    mealHints: ["breakfast"],
    calories: 340,
    protein: 22,
    carbs: 28,
    fat: 15,
    fiber: 3,
    iron: 3.1,
    vitaminC: 1,
  },
  {
    id: "food-11",
    name: "Cottage cheese bowl",
    servingSize: "1 bowl",
    source: "Verified",
    mealHints: ["breakfast", "snack"],
    calories: 180,
    protein: 23,
    carbs: 9,
    fat: 5,
    fiber: 1,
    iron: 0.2,
    vitaminC: 6,
  },
  {
    id: "food-12",
    name: "Halloumi grain salad",
    servingSize: "1 bowl",
    source: "Recipe",
    mealHints: ["lunch", "dinner"],
    calories: 470,
    protein: 19,
    carbs: 36,
    fat: 28,
    fiber: 7,
    iron: 1.5,
    vitaminC: 40,
  },
  {
    id: "food-13",
    name: "Chickpea curry",
    servingSize: "1 bowl",
    source: "Recipe",
    mealHints: ["lunch", "dinner"],
    calories: 430,
    protein: 18,
    carbs: 48,
    fat: 16,
    fiber: 13,
    iron: 4.3,
    vitaminC: 20,
  },
  {
    id: "food-14",
    name: "Banana",
    servingSize: "1 medium",
    source: "Verified",
    mealHints: ["snack"],
    calories: 105,
    protein: 1.3,
    carbs: 27,
    fat: 0.4,
    fiber: 3.1,
    iron: 0.3,
    vitaminC: 10,
  },
  {
    id: "food-15",
    name: "Steak and greens",
    servingSize: "1 plate",
    source: "Recipe",
    mealHints: ["dinner"],
    calories: 540,
    protein: 44,
    carbs: 18,
    fat: 28,
    fiber: 5,
    iron: 5.4,
    vitaminC: 35,
  },
  {
    id: "food-16",
    name: "Bell pepper and hummus snack",
    servingSize: "1 snack pot",
    source: "Recipe",
    mealHints: ["snack"],
    calories: 160,
    protein: 5,
    carbs: 12,
    fat: 9,
    fiber: 4,
    iron: 1,
    vitaminC: 60,
  },
  {
    id: "food-17",
    name: "Turkey chilli",
    servingSize: "1 bowl",
    source: "Recipe",
    mealHints: ["lunch", "dinner"],
    calories: 410,
    protein: 35,
    carbs: 32,
    fat: 14,
    fiber: 10,
    iron: 4,
    vitaminC: 18,
  },
  {
    id: "food-18",
    name: "Peanut butter toast",
    servingSize: "1 slice",
    source: "Recipe",
    mealHints: ["breakfast", "snack"],
    calories: 260,
    protein: 10,
    carbs: 24,
    fat: 14,
    fiber: 4,
    iron: 1.1,
    vitaminC: 0,
  },
];

const foodMap = new Map(FOOD_DATABASE.map((food) => [food.id, food]));

function food(foodId: string) {
  const item = foodMap.get(foodId);
  if (!item) {
    throw new Error(`Missing demo food: ${foodId}`);
  }
  return item;
}

const today = formatDateKey(new Date());

const demoLogs: MealLogItem[] = [
  { id: "meal-01", food: food("food-1"), quantity: 1, mealType: "breakfast", loggedAt: shiftDateKey(today, -6) },
  { id: "meal-02", food: food("food-2"), quantity: 1, mealType: "breakfast", loggedAt: shiftDateKey(today, -6) },
  { id: "meal-03", food: food("food-4"), quantity: 1, mealType: "lunch", loggedAt: shiftDateKey(today, -6) },
  { id: "meal-04", food: food("food-9"), quantity: 1, mealType: "snack", loggedAt: shiftDateKey(today, -6) },
  { id: "meal-05", food: food("food-17"), quantity: 1, mealType: "dinner", loggedAt: shiftDateKey(today, -6) },
  { id: "meal-06", food: food("food-10"), quantity: 1, mealType: "breakfast", loggedAt: shiftDateKey(today, -5) },
  { id: "meal-07", food: food("food-3"), quantity: 1, mealType: "lunch", loggedAt: shiftDateKey(today, -5) },
  { id: "meal-08", food: food("food-7"), quantity: 1, mealType: "snack", loggedAt: shiftDateKey(today, -5) },
  { id: "meal-09", food: food("food-5"), quantity: 1, mealType: "dinner", loggedAt: shiftDateKey(today, -5) },
  { id: "meal-10", food: food("food-11"), quantity: 1, mealType: "breakfast", loggedAt: shiftDateKey(today, -4) },
  { id: "meal-11", food: food("food-12"), quantity: 1, mealType: "lunch", loggedAt: shiftDateKey(today, -4) },
  { id: "meal-12", food: food("food-8"), quantity: 1, mealType: "snack", loggedAt: shiftDateKey(today, -4) },
  { id: "meal-13", food: food("food-13"), quantity: 1, mealType: "dinner", loggedAt: shiftDateKey(today, -4) },
  { id: "meal-14", food: food("food-1"), quantity: 1, mealType: "breakfast", loggedAt: shiftDateKey(today, -3) },
  { id: "meal-15", food: food("food-6"), quantity: 1, mealType: "lunch", loggedAt: shiftDateKey(today, -3) },
  { id: "meal-16", food: food("food-16"), quantity: 1, mealType: "snack", loggedAt: shiftDateKey(today, -3) },
  { id: "meal-17", food: food("food-15"), quantity: 1, mealType: "dinner", loggedAt: shiftDateKey(today, -3) },
  { id: "meal-18", food: food("food-2"), quantity: 1, mealType: "breakfast", loggedAt: shiftDateKey(today, -2) },
  { id: "meal-19", food: food("food-4"), quantity: 1, mealType: "lunch", loggedAt: shiftDateKey(today, -2) },
  { id: "meal-20", food: food("food-14"), quantity: 1, mealType: "snack", loggedAt: shiftDateKey(today, -2) },
  { id: "meal-21", food: food("food-17"), quantity: 1, mealType: "dinner", loggedAt: shiftDateKey(today, -2) },
  { id: "meal-22", food: food("food-10"), quantity: 1, mealType: "breakfast", loggedAt: shiftDateKey(today, -1) },
  { id: "meal-23", food: food("food-5"), quantity: 1, mealType: "lunch", loggedAt: shiftDateKey(today, -1) },
  { id: "meal-24", food: food("food-7"), quantity: 1, mealType: "snack", loggedAt: shiftDateKey(today, -1) },
  { id: "meal-25", food: food("food-13"), quantity: 1, mealType: "dinner", loggedAt: shiftDateKey(today, -1) },
  { id: "meal-26", food: food("food-1"), quantity: 1, mealType: "breakfast", loggedAt: today },
  { id: "meal-27", food: food("food-2"), quantity: 1, mealType: "breakfast", loggedAt: today },
  { id: "meal-28", food: food("food-6"), quantity: 1, mealType: "lunch", loggedAt: today },
  { id: "meal-29", food: food("food-8"), quantity: 1, mealType: "snack", loggedAt: today },
];

const demoWorkouts: WorkoutLog[] = [
  {
    id: "workout-1",
    type: "Strength circuit",
    durationMinutes: 45,
    caloriesBurned: 280,
    intensity: "Moderate",
    loggedAt: shiftDateKey(today, -6),
  },
  {
    id: "workout-2",
    type: "Tempo run",
    durationMinutes: 35,
    caloriesBurned: 320,
    intensity: "High",
    loggedAt: shiftDateKey(today, -4),
  },
  {
    id: "workout-3",
    type: "Strength circuit",
    durationMinutes: 50,
    caloriesBurned: 340,
    intensity: "High",
    loggedAt: shiftDateKey(today, -2),
  },
  {
    id: "workout-4",
    type: "Incline walk",
    durationMinutes: 25,
    caloriesBurned: 180,
    intensity: "Low",
    loggedAt: today,
  },
];

const demoSteps: StepEntry[] = [
  { date: shiftDateKey(today, -6), steps: 11840, caloriesBurned: 420, distanceKm: 8.9, activeMinutes: 86, routeName: "Canal reset loop" },
  { date: shiftDateKey(today, -5), steps: 9200, caloriesBurned: 330, distanceKm: 6.8, activeMinutes: 64 },
  { date: shiftDateKey(today, -4), steps: 13500, caloriesBurned: 470, distanceKm: 10.2, activeMinutes: 102, routeName: "Park strides" },
  { date: shiftDateKey(today, -3), steps: 8400, caloriesBurned: 300, distanceKm: 6.1, activeMinutes: 58 },
  { date: shiftDateKey(today, -2), steps: 10980, caloriesBurned: 390, distanceKm: 8.4, activeMinutes: 81 },
  { date: shiftDateKey(today, -1), steps: 7600, caloriesBurned: 275, distanceKm: 5.7, activeMinutes: 49 },
  { date: today, steps: 8940, caloriesBurned: 315, distanceKm: 6.6, activeMinutes: 61, routeName: "Lunch hour lap" },
];

const demoWeights: WeightEntry[] = [
  { date: shiftDateKey(today, -6), weight: 82.4 },
  { date: shiftDateKey(today, -5), weight: 82.2 },
  { date: shiftDateKey(today, -4), weight: 82.0 },
  { date: shiftDateKey(today, -3), weight: 81.8 },
  { date: shiftDateKey(today, -2), weight: 81.6 },
  { date: shiftDateKey(today, -1), weight: 81.4 },
  { date: today, weight: 81.2 },
];

const demoGoal: DailyGoal = {
  calories: 2050,
  protein: 150,
  carbs: 215,
  fat: 68,
  fiber: 30,
  iron: 18,
  vitaminC: 90,
  steps: 10000,
  targetWeight: 78,
};

const demoProfile: UserProfile = {
  name: "Jamie Carter",
  goal: "Lose weight",
  age: 31,
  heightCm: 175,
  currentWeight: 81.2,
  targetWeight: 78,
  activityLevel: "Lightly active",
  preferences: ["High protein", "Quick lunches", "Meal prep friendly"],
  onboardingCompletion: 86,
  reminderStatus: "Meal reminders on at 12:30 and 19:00",
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [mealLogs, setMealLogs] = useState<MealLogItem[]>(demoLogs);
  const [dailyGoal] = useState<DailyGoal>(demoGoal);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>(demoWeights);
  const [favouriteFoodIds, setFavouriteFoodIds] = useState<string[]>(["food-2", "food-5", "food-6", "food-7"]);
  const [currentDate, setCurrentDate] = useState(today);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>(demoWorkouts);
  const [stepEntries] = useState<StepEntry[]>(demoSteps);
  const [profile] = useState<UserProfile>(demoProfile);
  const [routeLibrary] = useState<RouteRecommendation[]>(ROUTE_LIBRARY);

  const getMealsForDate = useCallback(
    (date?: string) => {
      const resolvedDate = date ?? currentDate;
      return mealLogs.filter((log) => log.loggedAt === resolvedDate);
    },
    [currentDate, mealLogs],
  );

  const getDailyTotals = useCallback(
    (date?: string) => {
      return getMealsForDate(date).reduce<Nutrients>((totals, log) => {
        nutrientKeys.forEach((key) => {
          totals[key] += log.food[key] * log.quantity;
        });
        return totals;
      }, createEmptyNutrition());
    },
    [getMealsForDate],
  );

  const getMealsByType = useCallback(
    (mealType: MealType, date?: string) => getMealsForDate(date).filter((log) => log.mealType === mealType),
    [getMealsForDate],
  );

  const getDailyActivity = useCallback(
    (date?: string) => {
      const resolvedDate = date ?? currentDate;
      const dailyTotals = getDailyTotals(resolvedDate);
      const stepEntry = stepEntries.find((entry) => entry.date === resolvedDate);
      const workouts = workoutLogs.filter((workout) => workout.loggedAt === resolvedDate);
      const workoutBurn = workouts.reduce((sum, workout) => sum + workout.caloriesBurned, 0);
      const stepBurn = stepEntry?.caloriesBurned ?? 0;
      const totalBurn = stepBurn + workoutBurn;
      const adjustedBudget = dailyGoal.calories + totalBurn;

      return {
        steps: stepEntry?.steps ?? 0,
        stepBurn,
        workoutBurn,
        totalBurn,
        activeMinutes: (stepEntry?.activeMinutes ?? 0) + workouts.reduce((sum, workout) => sum + workout.durationMinutes, 0),
        distanceKm: stepEntry?.distanceKm ?? 0,
        routeName: stepEntry?.routeName ?? null,
        workouts,
        adjustedBudget,
        remainingBudget: adjustedBudget - dailyTotals.calories,
        netCalories: dailyTotals.calories - totalBurn,
      };
    },
    [currentDate, dailyGoal.calories, getDailyTotals, stepEntries, workoutLogs],
  );

  const addMealLog = useCallback(
    (item: Omit<MealLogItem, "id" | "loggedAt">) => {
      setMealLogs((previous) => [
        ...previous,
        {
          ...item,
          id: crypto.randomUUID(),
          loggedAt: currentDate,
        },
      ]);
    },
    [currentDate],
  );

  const removeMealLog = useCallback((id: string) => {
    setMealLogs((previous) => previous.filter((log) => log.id !== id));
  }, []);

  const toggleFavourite = useCallback((foodId: string) => {
    setFavouriteFoodIds((previous) =>
      previous.includes(foodId) ? previous.filter((id) => id !== foodId) : [...previous, foodId],
    );
  }, []);

  const addWeightEntry = useCallback((entry: WeightEntry) => {
    setWeightEntries((previous) =>
      [...previous.filter((item) => item.date !== entry.date), entry].sort((left, right) => left.date.localeCompare(right.date)),
    );
  }, []);

  const addWorkout = useCallback(
    (workout: Omit<WorkoutLog, "id" | "loggedAt"> & { loggedAt?: string }) => {
      setWorkoutLogs((previous) => [
        ...previous,
        {
          ...workout,
          id: crypto.randomUUID(),
          loggedAt: workout.loggedAt ?? currentDate,
        },
      ]);
    },
    [currentDate],
  );

  const getRecentFoods = useCallback(() => {
    const seen = new Set<string>();
    return mealLogs
      .slice()
      .sort((left, right) => right.loggedAt.localeCompare(left.loggedAt))
      .filter((log) => {
        if (seen.has(log.food.id)) {
          return false;
        }
        seen.add(log.food.id);
        return true;
      })
      .map((log) => log.food)
      .slice(0, 8);
  }, [mealLogs]);

  const getFavouriteFoods = useCallback(
    () => favouriteFoodIds.map((foodId) => foodMap.get(foodId)).filter((item): item is Food => Boolean(item)),
    [favouriteFoodIds],
  );

  const getStreakInfo = useCallback(
    (date?: string) => {
      const resolvedDate = date ?? currentDate;
      const loggedDates = new Set(mealLogs.map((log) => log.loggedAt));
      let count = 0;
      let forgivenessRemaining = 1;

      for (let offset = 0; offset < 30; offset += 1) {
        const targetDate = shiftDateKey(resolvedDate, -offset);
        if (loggedDates.has(targetDate)) {
          count += 1;
          continue;
        }
        if (forgivenessRemaining > 0) {
          forgivenessRemaining -= 1;
          continue;
        }
        break;
      }

      return { count, forgivenessRemaining };
    },
    [currentDate, mealLogs],
  );

  const getNutrientGaps = useCallback(
    (date?: string) => {
      const totals = getDailyTotals(date);
      const targets: Array<Pick<NutrientGap, "key" | "label" | "unit">> = [
        { key: "protein", label: "Protein", unit: "g" },
        { key: "fiber", label: "Fiber", unit: "g" },
        { key: "iron", label: "Iron", unit: "mg" },
        { key: "vitaminC", label: "Vitamin C", unit: "mg" },
      ];

      return targets
        .map((target) => ({
          ...target,
          current: totals[target.key],
          goal: dailyGoal[target.key],
          remaining: Math.max(dailyGoal[target.key] - totals[target.key], 0),
        }))
        .sort((left, right) => right.remaining - left.remaining);
    },
    [dailyGoal, getDailyTotals],
  );

  const getSmartSuggestions = useCallback(
    (date?: string) => {
      const topGaps = getNutrientGaps(date).filter((gap) => gap.remaining > 0).slice(0, 3);
      if (topGaps.length === 0) {
        return getRecentFoods().slice(0, 3);
      }

      return FOOD_DATABASE
        .map((entry) => ({
          food: entry,
          score: topGaps.reduce((sum, gap, index) => {
            const weight = 3 - index;
            return sum + ((entry[gap.key] / Math.max(gap.remaining, 1)) * weight);
          }, 0),
        }))
        .sort((left, right) => right.score - left.score)
        .map((entry) => entry.food)
        .slice(0, 4);
    },
    [getNutrientGaps, getRecentFoods],
  );

  const getWeeklyNutrition = useCallback(
    (days = 7, anchorDate = currentDate) => {
      return Array.from({ length: days }, (_, index) => {
        const date = shiftDateKey(anchorDate, index - (days - 1));
        const totals = getDailyTotals(date);
        const activity = getDailyActivity(date);

        return {
          date,
          label: formatShortDate(date),
          calories: totals.calories,
          goal: dailyGoal.calories,
          adjustedBudget: activity.adjustedBudget,
          remainingBudget: activity.remainingBudget,
          burn: activity.totalBurn,
          protein: totals.protein,
          carbs: totals.carbs,
          fat: totals.fat,
        };
      });
    },
    [currentDate, dailyGoal.calories, getDailyActivity, getDailyTotals],
  );

  return (
    <AppContext.Provider
      value={{
        mealLogs,
        dailyGoal,
        weightEntries,
        favouriteFoodIds,
        currentDate,
        workoutLogs,
        stepEntries,
        profile,
        routeLibrary,
        addMealLog,
        removeMealLog,
        toggleFavourite,
        addWeightEntry,
        addWorkout,
        setCurrentDate,
        getDailyTotals,
        getMealsForDate,
        getMealsByType,
        getDailyActivity,
        getRecentFoods,
        getFavouriteFoods,
        getStreakInfo,
        getNutrientGaps,
        getSmartSuggestions,
        getWeeklyNutrition,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used inside AppProvider");
  }
  return context;
}
