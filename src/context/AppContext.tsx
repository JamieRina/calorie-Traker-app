import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { checkBackendHealth } from "@/lib/api";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type AppMode = "simple" | "advanced";
export type ThemeMode = "dark" | "light";
export type ResolvedTheme = "dark" | "light";

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

export interface DailyGoal extends Nutrients {
  steps: number;
  targetWeight: number;
}

export interface MealLogItem {
  id: string;
  food: Food;
  quantity: number;
  mealType: MealType;
  loggedAt: string;
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

interface AppContextType {
  currentDate: string;
  setCurrentDate: (date: string) => void;
  uiMode: AppMode;
  setUiMode: (mode: AppMode) => void;
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (mode: ThemeMode) => void;
  isBackendReady: boolean;
  isBootstrapping: boolean;
  backendError: string | null;
  retryBackendConnection: () => void;
  routeLibrary: RouteRecommendation[];
  workoutPresets: Array<Omit<WorkoutLog, "id" | "loggedAt">>;
  rememberedFoods: Food[];
  rememberFoods: (foods: Food[]) => void;
}

const UI_MODE_STORAGE_KEY = "nutritrack-ui-mode";
const THEME_MODE_STORAGE_KEY = "nutritrack-theme-mode";

const AppContext = createContext<AppContextType | undefined>(undefined);

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

function readStoredMode(): AppMode {
  if (typeof window === "undefined") {
    return "simple";
  }

  const stored = window.localStorage.getItem(UI_MODE_STORAGE_KEY);
  return stored === "advanced" ? "advanced" : "simple";
}

function readStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  const stored = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
  return stored === "light" ? "light" : "dark";
}

function mergeFoods(existingFoods: Food[], incomingFoods: Food[]) {
  const indexedFoods = new Map(existingFoods.map((food) => [food.id, food]));
  incomingFoods.forEach((food) => indexedFoods.set(food.id, food));
  return Array.from(indexedFoods.values());
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

export const ALL_MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

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
    id: "food-oats",
    name: "Overnight oats",
    servingSize: "1 bowl",
    source: "Recipe",
    mealHints: ["breakfast"],
    calories: 320,
    protein: 16,
    carbs: 44,
    fat: 9,
    fiber: 7,
    iron: 2,
    vitaminC: 4,
  },
  {
    id: "food-yoghurt",
    name: "Greek yoghurt",
    servingSize: "170 g",
    source: "Verified",
    mealHints: ["breakfast", "snack"],
    calories: 140,
    protein: 17,
    carbs: 7,
    fat: 4,
    fiber: 0,
    iron: 0.1,
    vitaminC: 0,
  },
  {
    id: "food-banana",
    name: "Banana",
    servingSize: "1 medium",
    source: "Verified",
    mealHints: ["breakfast", "snack"],
    calories: 105,
    protein: 1.3,
    carbs: 27,
    fat: 0.4,
    fiber: 3.1,
    iron: 0.3,
    vitaminC: 10,
  },
  {
    id: "food-rice-bowl",
    name: "Chicken rice bowl",
    servingSize: "1 bowl",
    source: "Recipe",
    mealHints: ["lunch", "dinner"],
    calories: 540,
    protein: 36,
    carbs: 54,
    fat: 17,
    fiber: 5,
    iron: 2.1,
    vitaminC: 12,
  },
  {
    id: "food-salmon",
    name: "Salmon and greens",
    servingSize: "1 plate",
    source: "Recipe",
    mealHints: ["dinner"],
    calories: 500,
    protein: 34,
    carbs: 18,
    fat: 25,
    fiber: 4,
    iron: 1.4,
    vitaminC: 18,
  },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentDate, setCurrentDate] = useState(() => formatDateKey(new Date()));
  const [uiMode, setUiModeState] = useState<AppMode>(() => readStoredMode());
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => readStoredThemeMode());
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [rememberedFoods, setRememberedFoods] = useState<Food[]>([]);
  const [connectionAttempt, setConnectionAttempt] = useState(0);

  useEffect(() => {
    let isActive = true;

    setIsBootstrapping(true);
    setBackendError(null);

    checkBackendHealth()
      .then(() => {
        if (!isActive) {
          return;
        }

        setIsBackendReady(true);
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        setIsBackendReady(false);
        setBackendError(error instanceof Error ? error.message : "Data service unavailable");
      })
      .finally(() => {
        if (isActive) {
          setIsBootstrapping(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [connectionAttempt]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(UI_MODE_STORAGE_KEY, uiMode);
    }
  }, [uiMode]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
    }
  }, [themeMode]);

  const resolvedTheme: ResolvedTheme = themeMode;

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.classList.toggle("light", resolvedTheme === "light");
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  const setUiMode = useCallback((mode: AppMode) => {
    setUiModeState(mode);
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
  }, []);

  const retryBackendConnection = useCallback(() => {
    setConnectionAttempt((attempt) => attempt + 1);
  }, []);

  const rememberFoods = useCallback((foods: Food[]) => {
    if (foods.length === 0) {
      return;
    }

    setRememberedFoods((previous) => mergeFoods(previous, foods));
  }, []);

  const value = useMemo(
    () => ({
      currentDate,
      setCurrentDate,
      uiMode,
      setUiMode,
      themeMode,
      resolvedTheme,
      setThemeMode,
      isBackendReady,
      isBootstrapping,
      backendError,
      retryBackendConnection,
      routeLibrary: ROUTE_LIBRARY,
      workoutPresets: WORKOUT_PRESETS,
      rememberedFoods,
      rememberFoods,
    }),
    [
      backendError,
      currentDate,
      isBackendReady,
      isBootstrapping,
      rememberFoods,
      rememberedFoods,
      retryBackendConnection,
      resolvedTheme,
      setThemeMode,
      setUiMode,
      themeMode,
      uiMode,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used inside AppProvider");
  }
  return context;
}
