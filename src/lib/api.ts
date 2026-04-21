import type { DailyGoal, Food, MealType, Nutrients, UserProfile } from "@/context/AppContext";

const DEFAULT_API_BASE_URL = "http://localhost:4000/api/v1";
const SESSION_STORAGE_KEY = "nutritrack-session";
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");
const ALL_MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

export type GoalType = "lose" | "maintain" | "gain";

export type StarterProfileInput = {
  displayName: string;
  goalType: GoalType;
  age: number;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "athlete";
};

type ApiNutritionFact = {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fibreGrams: number | null;
  servingSize?: number | null;
  servingUnit?: string | null;
};

type ApiFoodEntity = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  nutritionFact: ApiNutritionFact;
};

type ApiFavourite = {
  id: string;
  food: ApiFoodEntity | null;
};

type ApiMealLog = {
  id: string;
  mealType: MealType;
  consumedAt: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFibre: number;
  items: Array<{
    id: string;
    displayName: string;
    portionCount: number;
    food: ApiFoodEntity | null;
    recipe: {
      id: string;
      title: string;
    } | null;
  }>;
};

type ApiWorkout = {
  id: string;
  title: string;
  caloriesBurned: number | null;
  durationMin: number | null;
  performedAt: string;
  notes: string | null;
};

type ApiProgressEntry = {
  id: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  mood: string | null;
  note: string | null;
  recordedAt: string;
};

type ApiGoal = {
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  fibreGrams: number;
  goalType: "lose" | "maintain" | "gain";
};

type ApiProfileResponse = {
  id: string;
  email: string;
  displayName: string;
  profile: {
    dateOfBirth: string | null;
    sex: string | null;
    heightCm: number | null;
    currentWeightKg: number | null;
    targetWeightKg: number | null;
    activityLevel: string;
    timezone: string;
    locale: string;
    onboardingDone: boolean;
  } | null;
  goal: ApiGoal | null;
  preferences: Array<{
    type: string;
    value: string;
  }>;
};

type FoodSearchApiResponse = {
  id: string;
  name: string;
  brand: string | null;
  servingSize: string;
  source: "local" | "usda" | "open_food_facts";
  sourceLabel: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fibreGrams: number;
  barcode: string | null;
  imageUrl: string | null;
};

type ApiDashboardResponse = {
  date: string;
  daily: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fibre: number;
  };
  goal: ApiGoal | null;
  remainingCalories: number | null;
  caloriesBurned: number;
  netCalories: number;
  mealCount: number;
  workoutCount: number;
  meals: ApiMealLog[];
  workouts: ApiWorkout[];
  weeklyTrend: Array<{
    day: string;
    calories: number;
  }>;
  latestProgress: ApiProgressEntry[];
};

type ApiError = Error & {
  status?: number;
};

export type SearchFood = Food & {
  apiSource: "local" | "usda" | "open_food_facts";
  sourceLabel: string;
  barcode?: string;
  imageUrl?: string;
};

export type DashboardMeal = {
  id: string;
  mealType: MealType;
  consumedAt: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFibre: number;
  itemCount: number;
  itemNames: string[];
};

export type WorkoutEntry = {
  id: string;
  title: string;
  caloriesBurned: number;
  durationMinutes: number;
  performedAt: string;
  notes?: string;
};

export type ProgressEntry = {
  id: string;
  weightKg?: number;
  bodyFatPct?: number;
  mood?: string;
  note?: string;
  recordedAt: string;
};

export type DashboardSummary = {
  date: string;
  daily: Nutrients;
  goal: DailyGoal | null;
  remainingCalories: number | null;
  caloriesBurned: number;
  netCalories: number;
  mealCount: number;
  workoutCount: number;
  meals: DashboardMeal[];
  workouts: WorkoutEntry[];
  weeklyTrend: Array<{
    day: string;
    label: string;
    calories: number;
  }>;
  latestProgress: ProgressEntry[];
};

export type CommunityFeed = {
  featured: Array<{
    id: string;
    slug: string;
    title: string;
    summary: string;
    contentType: string;
    authorName: string;
    isPremium?: boolean;
  }>;
  latest: Array<{
    id: string;
    slug: string;
    title: string;
    summary: string;
    contentType: string;
    authorName: string;
    isPremium?: boolean;
  }>;
  challenges: Array<{
    id: string;
    title: string;
    slug: string;
    description: string;
    startsAt: string;
    endsAt: string;
  }>;
};

let sessionCache: SessionTokens | null = null;

function createApiError(message: string, status?: number) {
  const error = new Error(message) as ApiError;
  error.status = status;
  return error;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function readStoredSession() {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionTokens;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function writeStoredSession(session: SessionTokens) {
  sessionCache = session;
  if (isBrowser()) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }
}

function clearStoredSession() {
  sessionCache = null;
  if (isBrowser()) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

function getApiRootUrl() {
  return apiBaseUrl.replace(/\/api\/v\d+$/, "");
}

export function hasStoredSession() {
  return Boolean(sessionCache ?? readStoredSession());
}

export function clearSession() {
  clearStoredSession();
}

function defaultHeaders(init?: HeadersInit) {
  return {
    "Content-Type": "application/json",
    ...(init ?? {}),
  };
}

async function parseResponse<T>(response: Response) {
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) {
        message = body.message;
      }
    } catch {
      try {
        const text = await response.text();
        if (text.trim()) {
          message = text;
        }
      } catch {
        // Ignore unreadable bodies and keep the default message.
      }
    }

    throw createApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function publicRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: defaultHeaders(init?.headers),
  });

  return parseResponse<T>(response);
}

async function requestAuthTokens(path: string, body: Record<string, unknown>) {
  return publicRequest<SessionTokens>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function refreshSession() {
  const existingSession = sessionCache ?? readStoredSession();
  if (!existingSession?.refreshToken) {
    throw createApiError("No refresh token available");
  }

  const refreshedSession = await requestAuthTokens("/auth/refresh", {
    refreshToken: existingSession.refreshToken,
  });

  writeStoredSession(refreshedSession);
  return refreshedSession;
}

async function ensureSession() {
  if (sessionCache) {
    return sessionCache;
  }

  const storedSession = readStoredSession();
  if (storedSession) {
    sessionCache = storedSession;
    return storedSession;
  }

  throw createApiError("Please log in to continue.", 401);
}

async function authedRequest<T>(path: string, init?: RequestInit, allowRetry = true): Promise<T> {
  const session = await ensureSession();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: defaultHeaders({
      Authorization: `Bearer ${session.accessToken}`,
      ...(init?.headers ?? {}),
    }),
  });

  if (response.status === 401 && allowRetry) {
    try {
      await refreshSession();
    } catch {
      clearStoredSession();
      throw createApiError("Session expired. Please try again.", 401);
    }

    return authedRequest<T>(path, init, false);
  }

  return parseResponse<T>(response);
}

function dateOfBirthFromAge(age: number) {
  const safeAge = Number.isFinite(age) ? Math.min(Math.max(Math.round(age), 13), 100) : 30;
  const date = new Date();
  date.setFullYear(date.getFullYear() - safeAge);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

export async function checkBackendHealth() {
  const response = await fetch(`${getApiRootUrl()}/health`, {
    headers: {
      Accept: "application/json",
    },
  });

  return parseResponse<{ status: string; timestamp: string }>(response);
}

export async function loginWithEmail(email: string, password: string) {
  const session = await requestAuthTokens("/auth/login", {
    email: email.trim().toLowerCase(),
    password,
  });

  writeStoredSession(session);
  return session;
}

export async function saveStarterProfile(input: StarterProfileInput) {
  await authedRequest<ApiProfileResponse>("/profile/me", {
    method: "PATCH",
    body: JSON.stringify({
      displayName: input.displayName.trim(),
      dateOfBirth: dateOfBirthFromAge(input.age),
      sex: "undisclosed",
      heightCm: input.heightCm,
      currentWeightKg: input.currentWeightKg,
      targetWeightKg: input.targetWeightKg,
      activityLevel: input.activityLevel,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London",
      locale: navigator.language || "en-GB",
      onboardingDone: true,
      preferences: [
        { type: "diet", value: "balanced" },
        { type: "tracking", value: "fast_daily_logging" },
      ],
    }),
  });

  await authedRequest("/profile/goal", {
    method: "POST",
    body: JSON.stringify({
      goalType: input.goalType,
    }),
  });
}

export async function registerAccount(input: StarterProfileInput & { email: string; password: string }) {
  const session = await requestAuthTokens("/auth/register", {
    email: input.email.trim().toLowerCase(),
    password: input.password,
    displayName: input.displayName.trim(),
  });

  writeStoredSession(session);
  await saveStarterProfile(input);
  return session;
}

export async function logoutAccount() {
  const existingSession = sessionCache ?? readStoredSession();

  try {
    if (existingSession?.refreshToken) {
      await publicRequest("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken: existingSession.refreshToken }),
      });
    }
  } finally {
    clearStoredSession();
  }
}

function formatAge(dateOfBirth?: string | null) {
  if (!dateOfBirth) {
    return 30;
  }

  const ageMs = Date.now() - new Date(dateOfBirth).getTime();
  return Math.max(18, Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000)));
}

function mapGoalType(goalType?: ApiGoal["goalType"] | null): UserProfile["goal"] {
  if (goalType === "gain") {
    return "Gain muscle";
  }

  if (goalType === "maintain") {
    return "Maintain";
  }

  return "Lose weight";
}

function mapGoal(goal: ApiGoal | null, targetWeight?: number | null): DailyGoal | null {
  if (!goal) {
    return null;
  }

  return {
    calories: goal.dailyCalories,
    protein: goal.proteinGrams,
    carbs: goal.carbsGrams,
    fat: goal.fatsGrams,
    fiber: goal.fibreGrams,
    iron: 18,
    vitaminC: 90,
    steps: 10000,
    targetWeight: targetWeight ?? 75,
  };
}

function mapProfile(response: ApiProfileResponse) {
  const latestWeight = response.profile?.currentWeightKg ?? 82;
  const targetWeight = response.profile?.targetWeightKg ?? latestWeight;
  const profile: UserProfile = {
    name: response.displayName,
    goal: mapGoalType(response.goal?.goalType),
    age: formatAge(response.profile?.dateOfBirth),
    heightCm: response.profile?.heightCm ?? 175,
    currentWeight: latestWeight,
    targetWeight,
    activityLevel: response.profile?.activityLevel ?? "moderate",
    preferences: response.preferences.map((item) => item.value.replace(/_/g, " ")),
    onboardingCompletion: response.profile?.onboardingDone ? 100 : 72,
    reminderStatus: "Meal reminders are available in advanced mode",
  };

  return {
    profile,
    dailyGoal: mapGoal(response.goal, targetWeight),
  };
}

function formatServing(nutritionFact: ApiNutritionFact) {
  if (nutritionFact.servingSize && nutritionFact.servingUnit) {
    return `${nutritionFact.servingSize} ${nutritionFact.servingUnit}`;
  }

  if (nutritionFact.servingUnit) {
    return nutritionFact.servingUnit;
  }

  return "1 serving";
}

function mapBackendFood(food: ApiFoodEntity, sourceLabel = "Saved foods"): Food {
  return {
    id: food.id,
    name: food.name,
    brand: food.brand ?? undefined,
    servingSize: formatServing(food.nutritionFact),
    source: "Verified",
    mealHints: ALL_MEAL_TYPES,
    calories: food.nutritionFact.calories,
    protein: food.nutritionFact.proteinGrams,
    carbs: food.nutritionFact.carbsGrams,
    fat: food.nutritionFact.fatGrams,
    fiber: food.nutritionFact.fibreGrams ?? 0,
    iron: 0,
    vitaminC: 0,
  };
}

function mapSearchFood(result: FoodSearchApiResponse): SearchFood {
  return {
    id: result.id,
    name: result.name,
    brand: result.brand ?? undefined,
    servingSize: result.servingSize,
    source: result.source === "local" ? "Verified" : "Community",
    mealHints: ALL_MEAL_TYPES,
    calories: result.calories,
    protein: result.proteinGrams,
    carbs: result.carbsGrams,
    fat: result.fatGrams,
    fiber: result.fibreGrams,
    iron: 0,
    vitaminC: 0,
    apiSource: result.source,
    sourceLabel: result.sourceLabel,
    barcode: result.barcode ?? undefined,
    imageUrl: result.imageUrl ?? undefined,
  };
}

function mapWorkout(workout: ApiWorkout): WorkoutEntry {
  return {
    id: workout.id,
    title: workout.title,
    caloriesBurned: workout.caloriesBurned ?? 0,
    durationMinutes: workout.durationMin ?? 0,
    performedAt: workout.performedAt,
    notes: workout.notes ?? undefined,
  };
}

function mapProgressEntry(entry: ApiProgressEntry): ProgressEntry {
  return {
    id: entry.id,
    weightKg: entry.weightKg ?? undefined,
    bodyFatPct: entry.bodyFatPct ?? undefined,
    mood: entry.mood ?? undefined,
    note: entry.note ?? undefined,
    recordedAt: entry.recordedAt,
  };
}

function mapDashboardMeal(meal: ApiMealLog): DashboardMeal {
  return {
    id: meal.id,
    mealType: meal.mealType,
    consumedAt: meal.consumedAt,
    totalCalories: meal.totalCalories,
    totalProtein: meal.totalProtein,
    totalCarbs: meal.totalCarbs,
    totalFat: meal.totalFat,
    totalFibre: meal.totalFibre,
    itemCount: meal.items.length,
    itemNames: meal.items.map((item) => item.displayName),
  };
}

function mapDashboardSummary(payload: ApiDashboardResponse): DashboardSummary {
  return {
    date: payload.date,
    daily: {
      calories: payload.daily.calories,
      protein: payload.daily.protein,
      carbs: payload.daily.carbs,
      fat: payload.daily.fat,
      fiber: payload.daily.fibre,
      iron: 0,
      vitaminC: 0,
    },
    goal: mapGoal(payload.goal, payload.latestProgress[0]?.weightKg ?? undefined),
    remainingCalories: payload.remainingCalories,
    caloriesBurned: payload.caloriesBurned,
    netCalories: payload.netCalories,
    mealCount: payload.mealCount,
    workoutCount: payload.workoutCount,
    meals: payload.meals.map(mapDashboardMeal),
    workouts: payload.workouts.map(mapWorkout),
    weeklyTrend: payload.weeklyTrend.map((entry) => ({
      day: entry.day,
      label: new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(new Date(`${entry.day}T12:00:00`)),
      calories: entry.calories,
    })),
    latestProgress: payload.latestProgress.map(mapProgressEntry),
  };
}

function normaliseImportedFood(food: Food | SearchFood) {
  return {
    name: food.name,
    brand: food.brand,
    servingSize: food.servingSize,
    calories: food.calories,
    proteinGrams: food.protein,
    carbsGrams: food.carbs,
    fatGrams: food.fat,
    fibreGrams: food.fiber,
    barcode: "barcode" in food ? food.barcode : undefined,
    sourceLabel: "sourceLabel" in food ? food.sourceLabel : "Imported",
  };
}

function needsFoodImport(food: Food | SearchFood) {
  return (
    food.id.startsWith("off-") ||
    food.id.startsWith("usda-") ||
    food.id.startsWith("food-") ||
    ("apiSource" in food && (food.apiSource === "open_food_facts" || food.apiSource === "usda"))
  );
}

async function resolveFoodId(food: Food | SearchFood) {
  if (!needsFoodImport(food)) {
    return food.id;
  }

  const importedFood = await importFood(normaliseImportedFood(food));
  return importedFood.id;
}

export async function searchFoods(query: string, limit = 12) {
  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(limit),
  });

  const payload = await publicRequest<FoodSearchApiResponse[]>(`/foods/search?${params.toString()}`);
  return payload.map(mapSearchFood);
}

export async function importFood(food: ReturnType<typeof normaliseImportedFood>) {
  const payload = await authedRequest<ApiFoodEntity>("/foods/import", {
    method: "POST",
    body: JSON.stringify(food),
  });

  return mapBackendFood(payload, "Saved foods");
}

export async function getDashboard(date: string) {
  const params = new URLSearchParams({ date });
  const payload = await authedRequest<ApiDashboardResponse>(`/analytics/dashboard?${params.toString()}`);
  return mapDashboardSummary(payload);
}

export async function createMealLog(input: {
  date: string;
  mealType: MealType;
  food: Food | SearchFood;
  quantity: number;
}) {
  const foodId = await resolveFoodId(input.food);

  return authedRequest<ApiMealLog>("/meals", {
    method: "POST",
    body: JSON.stringify({
      consumedAt: new Date(`${input.date}T12:00:00`).toISOString(),
      mealType: input.mealType,
      items: [
        {
          foodId,
          portionCount: input.quantity,
        },
      ],
    }),
  });
}

export async function deleteMealLog(mealId: string) {
  return authedRequest<{ success: true; deletedMealId: string }>(`/meals/${mealId}`, {
    method: "DELETE",
  });
}

export async function listRecentFoods() {
  const payload = await authedRequest<ApiFoodEntity[]>("/foods/recent");
  return payload.map((food) => mapBackendFood(food, "Recent foods"));
}

export async function listFavouriteFoods() {
  const payload = await authedRequest<ApiFavourite[]>("/foods/favourites");
  return payload
    .map((item) => item.food)
    .filter((food): food is ApiFoodEntity => Boolean(food))
    .map((food) => mapBackendFood(food, "Favourites"));
}

export async function setFavouriteFood(food: Food | SearchFood, isFavourite: boolean) {
  const foodId = await resolveFoodId(food);
  return authedRequest("/foods/favourites", {
    method: isFavourite ? "POST" : "DELETE",
    body: JSON.stringify({ foodId }),
  });
}

export async function listWorkouts() {
  const payload = await authedRequest<ApiWorkout[]>("/workouts");
  return payload.map(mapWorkout);
}

export async function createWorkoutEntry(input: {
  title: string;
  caloriesBurned: number;
  durationMinutes: number;
  performedAt: string;
}) {
  const payload = await authedRequest<ApiWorkout>("/workouts", {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      caloriesBurned: input.caloriesBurned,
      durationMin: input.durationMinutes,
      performedAt: input.performedAt,
    }),
  });

  return mapWorkout(payload);
}

export async function listProgressEntries() {
  const payload = await authedRequest<ApiProgressEntry[]>("/progress");
  return payload.map(mapProgressEntry);
}

export async function getProfileSummary() {
  const payload = await authedRequest<ApiProfileResponse>("/profile/me");
  return mapProfile(payload);
}

export async function getCommunityFeed() {
  return publicRequest<CommunityFeed>("/community/feed");
}

