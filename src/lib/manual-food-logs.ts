import type { MealType } from "@/context/AppContext";

export const MANUAL_FOOD_LOGS_KEY = "manualFoodLogs";
export const MANUAL_SAVED_FOODS_KEY = "manualSavedFoods";
export const MANUAL_SAVED_FOOD_LIMIT = 10;

export type ManualFoodLog = {
  id: string;
  foodName: string;
  amount: string;
  grams: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  meal: MealType;
  createdAt: string;
  date?: string;
};

export type ManualSavedFood = {
  id: string;
  foodName: string;
  amount: string;
  grams: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  createdAt: string;
  lastUsedAt: string;
};

function isMealType(value: unknown): value is MealType {
  return value === "breakfast" || value === "lunch" || value === "dinner" || value === "snack";
}

function normaliseText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function createManualFoodId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `manual-food-${crypto.randomUUID()}`;
  }

  return `manual-food-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function fallbackDateFromTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function isManualFoodLog(value: unknown): value is ManualFoodLog {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Partial<ManualFoodLog>;
  return (
    typeof item.id === "string" &&
    typeof item.foodName === "string" &&
    typeof item.amount === "string" &&
    (item.grams === undefined || item.grams === null || typeof item.grams === "number") &&
    (item.calories === null || typeof item.calories === "number") &&
    (item.protein === undefined || item.protein === null || typeof item.protein === "number") &&
    (item.carbs === undefined || item.carbs === null || typeof item.carbs === "number") &&
    (item.fat === undefined || item.fat === null || typeof item.fat === "number") &&
    (item.fiber === undefined || item.fiber === null || typeof item.fiber === "number") &&
    isMealType(item.meal) &&
    typeof item.createdAt === "string" &&
    (item.date === undefined || typeof item.date === "string")
  );
}

function isManualSavedFood(value: unknown): value is ManualSavedFood {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Partial<ManualSavedFood>;
  return (
    typeof item.id === "string" &&
    typeof item.foodName === "string" &&
    typeof item.amount === "string" &&
    (item.grams === undefined || item.grams === null || typeof item.grams === "number") &&
    (item.calories === null || typeof item.calories === "number") &&
    (item.protein === undefined || item.protein === null || typeof item.protein === "number") &&
    (item.carbs === undefined || item.carbs === null || typeof item.carbs === "number") &&
    (item.fat === undefined || item.fat === null || typeof item.fat === "number") &&
    (item.fiber === undefined || item.fiber === null || typeof item.fiber === "number") &&
    typeof item.createdAt === "string" &&
    typeof item.lastUsedAt === "string"
  );
}

export function getManualFoodLogDate(log: ManualFoodLog) {
  return log.date ?? fallbackDateFromTimestamp(log.createdAt);
}

export function getManualFoodLogKey(log: ManualFoodLog) {
  return [
    getManualFoodLogDate(log),
    log.meal,
    normaliseText(log.foodName),
    normaliseText(log.amount),
    log.grams ?? "",
    log.calories ?? "",
    log.protein ?? "",
    log.carbs ?? "",
    log.fat ?? "",
    log.fiber ?? "",
  ].join("::");
}

export function getManualFoodRecentKey(food: Pick<ManualFoodLog, "foodName" | "amount" | "grams" | "calories" | "protein" | "carbs" | "fat" | "fiber">) {
  return [
    normaliseText(food.foodName),
    normaliseText(food.amount),
    food.grams ?? "",
    food.calories ?? "",
    food.protein ?? "",
    food.carbs ?? "",
    food.fat ?? "",
    food.fiber ?? "",
  ].join("::");
}

export function readManualFoodLogs(): ManualFoodLog[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(MANUAL_FOOD_LOGS_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isManualFoodLog).map((log) => ({
      ...log,
      grams: log.grams ?? null,
      protein: log.protein ?? null,
      carbs: log.carbs ?? null,
      fat: log.fat ?? null,
      fiber: log.fiber ?? null,
    }));
  } catch {
    return [];
  }
}

export function writeManualFoodLogs(logs: ManualFoodLog[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(MANUAL_FOOD_LOGS_KEY, JSON.stringify(logs));
  window.dispatchEvent(new Event("manualFoodLogsUpdated"));
}

export function readManualSavedFoods(): ManualSavedFood[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(MANUAL_SAVED_FOODS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed)
        ? parsed
            .filter(isManualSavedFood)
            .map((food) => ({
              ...food,
              grams: food.grams ?? null,
              protein: food.protein ?? null,
              carbs: food.carbs ?? null,
              fat: food.fat ?? null,
              fiber: food.fiber ?? null,
            }))
            .slice(0, MANUAL_SAVED_FOOD_LIMIT)
        : [];
    }

    return getRecentManualFoodLogs(readManualFoodLogs()).map((log) => ({
      id: `manual-saved-${log.id}`,
      foodName: log.foodName,
      amount: log.amount,
      grams: log.grams,
      calories: log.calories,
      protein: log.protein,
      carbs: log.carbs,
      fat: log.fat,
      fiber: log.fiber,
      createdAt: log.createdAt,
      lastUsedAt: log.createdAt,
    }));
  } catch {
    return [];
  }
}

export function writeManualSavedFoods(foods: ManualSavedFood[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(MANUAL_SAVED_FOODS_KEY, JSON.stringify(foods.slice(0, MANUAL_SAVED_FOOD_LIMIT)));
}

export function createManualFoodLog(input: {
  foodName: string;
  amount: string;
  grams: number | null;
  calories: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  meal: MealType;
  date: string;
}): ManualFoodLog {
  return {
    id: createManualFoodId(),
    foodName: input.foodName,
    amount: input.amount,
    grams: input.grams,
    calories: input.calories,
    protein: input.protein ?? null,
    carbs: input.carbs ?? null,
    fat: input.fat ?? null,
    fiber: input.fiber ?? null,
    meal: input.meal,
    date: input.date,
    createdAt: new Date().toISOString(),
  };
}

export function createManualSavedFood(input: {
  foodName: string;
  amount: string;
  grams: number | null;
  calories: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
}): ManualSavedFood {
  const now = new Date().toISOString();
  return {
    id: createManualFoodId().replace("manual-food-", "manual-saved-"),
    foodName: input.foodName,
    amount: input.amount,
    grams: input.grams,
    calories: input.calories,
    protein: input.protein ?? null,
    carbs: input.carbs ?? null,
    fat: input.fat ?? null,
    fiber: input.fiber ?? null,
    createdAt: now,
    lastUsedAt: now,
  };
}

export function parseManualCalories(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return { calories: null, isValid: true };
  }

  const calories = Number(trimmed);
  return {
    calories,
    isValid: Number.isFinite(calories) && calories >= 0,
  };
}

export function parseManualOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return { value: null, isValid: true };
  }

  const parsed = Number(trimmed);
  return {
    value: parsed,
    isValid: Number.isFinite(parsed) && parsed >= 0,
  };
}

export function hasManualFoodLogDuplicate(logs: ManualFoodLog[], log: ManualFoodLog) {
  const key = getManualFoodLogKey(log);
  return logs.some((currentLog) => getManualFoodLogKey(currentLog) === key);
}

export function addManualFoodLog(logs: ManualFoodLog[], log: ManualFoodLog) {
  return [log, ...logs];
}

export function removeManualFoodLogById(logs: ManualFoodLog[], id: string) {
  return logs.filter((log) => log.id !== id);
}

export function upsertManualSavedFood(foods: ManualSavedFood[], food: ManualSavedFood) {
  const key = getManualFoodRecentKey(food);
  const existing = foods.find((savedFood) => getManualFoodRecentKey(savedFood) === key);
  const nextFood = existing
    ? {
        ...existing,
        lastUsedAt: new Date().toISOString(),
      }
    : food;

  return [nextFood, ...foods.filter((savedFood) => getManualFoodRecentKey(savedFood) !== key)].slice(0, MANUAL_SAVED_FOOD_LIMIT);
}

export function removeManualSavedFoodById(foods: ManualSavedFood[], id: string) {
  return foods.filter((food) => food.id !== id);
}

export function getRecentManualFoodLogs(logs: ManualFoodLog[]) {
  const recentLogs = new Map<string, ManualFoodLog>();

  logs.forEach((log) => {
    const key = getManualFoodRecentKey(log);
    if (!recentLogs.has(key)) {
      recentLogs.set(key, log);
    }
  });

  return Array.from(recentLogs.values());
}
