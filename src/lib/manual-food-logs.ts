import type { MealType } from "@/context/AppContext";

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

function normaliseText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function createManualFoodId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `manual-food-${crypto.randomUUID()}`;
  }

  return `manual-food-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

export function readManualSavedFoods(): ManualSavedFood[] {
  if (typeof window === "undefined") {
    return [];
  }

  window.localStorage.removeItem(MANUAL_SAVED_FOODS_KEY);

  try {
    const raw = window.sessionStorage.getItem(MANUAL_SAVED_FOODS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isManualSavedFood).slice(0, MANUAL_SAVED_FOOD_LIMIT) : [];
  } catch {
    window.sessionStorage.removeItem(MANUAL_SAVED_FOODS_KEY);
    return [];
  }
}

export function writeManualSavedFoods(foods: ManualSavedFood[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(MANUAL_SAVED_FOODS_KEY);
  window.sessionStorage.setItem(
    MANUAL_SAVED_FOODS_KEY,
    JSON.stringify(foods.filter(isManualSavedFood).slice(0, MANUAL_SAVED_FOOD_LIMIT)),
  );
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
