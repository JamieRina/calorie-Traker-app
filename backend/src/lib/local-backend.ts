import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import slugify from "slugify";
import { logger } from "../config/logger";
import { ApiError } from "./api-error";
import {
  ActivityLevel,
  GoalType,
  Sex,
  type ActivityLevel as ActivityLevelValue,
  type GoalType as GoalTypeValue,
  type MealType as MealTypeValue,
  type Sex as SexValue
} from "./domain-enums";
import { calculateCalorieGoal } from "../utils/calorie-goal";
import { rollupNutrition, scaleNutrition } from "../utils/nutrition";

type LocalNutritionFact = {
  id: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fibreGrams: number;
  servingSize: number | null;
  servingUnit: string | null;
  createdAt: string;
  updatedAt: string;
};

type LocalFood = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  category: string | null;
  searchVector: string | null;
  nutritionFactId: string;
  nutritionFact: LocalNutritionFact;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type LocalBrandedFood = {
  id: string;
  barcode: string;
  brandName: string;
  productName: string;
  nutritionFactId: string;
  nutritionFact: LocalNutritionFact;
  foodId: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
};

type LocalUser = {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

type LocalUserProfile = {
  id: string;
  userId: string;
  dateOfBirth: string | null;
  sex: SexValue;
  heightCm: number | null;
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  activityLevel: ActivityLevelValue;
  timezone: string;
  locale: string;
  avatarUrl: string | null;
  onboardingDone: boolean;
  createdAt: string;
  updatedAt: string;
};

type LocalGoal = {
  id: string;
  userId: string;
  goalType: GoalTypeValue;
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  fibreGrams: number;
  weeklyWeightDelta: number | null;
  createdAt: string;
  updatedAt: string;
};

type LocalDietaryPreference = {
  id: string;
  userId: string;
  type: string;
  value: string;
  createdAt: string;
};

type LocalMealItem = {
  id: string;
  mealLogId: string;
  foodId: string | null;
  recipeId: string | null;
  nutritionFactId: string;
  nutritionFact: LocalNutritionFact;
  portionCount: number;
  displayName: string;
  createdAt: string;
};

type LocalMealLog = {
  id: string;
  userId: string;
  consumedAt: string;
  mealType: MealTypeValue;
  notes: string | null;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFibre: number;
  createdAt: string;
  updatedAt: string;
  items: LocalMealItem[];
};

type LocalWorkout = {
  id: string;
  userId: string;
  title: string;
  caloriesBurned: number | null;
  durationMin: number | null;
  performedAt: string;
  notes: string | null;
  createdAt: string;
};

type LocalProgressEntry = {
  id: string;
  userId: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  mood: string | null;
  note: string | null;
  recordedAt: string;
  createdAt: string;
};

type LocalBackendStore = {
  version: 1;
  users: LocalUser[];
  profiles: LocalUserProfile[];
  goals: LocalGoal[];
  preferences: LocalDietaryPreference[];
  foods: LocalFood[];
  brandedFoods: LocalBrandedFood[];
  favourites: Array<{
    id: string;
    userId: string;
    foodId: string | null;
    recipeId: string | null;
    createdAt: string;
  }>;
  meals: LocalMealLog[];
  workouts: LocalWorkout[];
  progressEntries: LocalProgressEntry[];
};

type ProfileInput = {
  displayName?: string;
  preferences?: Array<{ type: string; value: string }>;
  dateOfBirth?: string;
  sex?: SexValue;
  heightCm?: number;
  currentWeightKg?: number;
  targetWeightKg?: number;
  activityLevel?: ActivityLevelValue;
  timezone?: string;
  locale?: string;
  onboardingDone?: boolean;
};

type ImportedFoodInput = {
  name: string;
  brand?: string;
  servingSize?: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fibreGrams?: number;
  barcode?: string;
  sourceLabel?: string;
};

type CreateMealInput = {
  consumedAt: string;
  mealType: MealTypeValue;
  notes?: string;
  items: Array<{ foodId?: string; recipeId?: string; portionCount?: number }>;
};

type CreateWorkoutInput = {
  title: string;
  caloriesBurned?: number;
  durationMin?: number;
  performedAt: string;
  notes?: string;
};

type CreateProgressInput = {
  weightKg?: number;
  bodyFatPct?: number;
  mood?: string;
  note?: string;
  recordedAt: string;
};

type FoodSearchResult = {
  id: string;
  name: string;
  brand: string | null;
  servingSize: string;
  source: "local" | "open_food_facts";
  sourceLabel: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fibreGrams: number;
  barcode: string | null;
  imageUrl: string | null;
};

const LOCAL_STORE_DIR = path.resolve(process.cwd(), ".local-data");
const LOCAL_STORE_PATH = path.join(LOCAL_STORE_DIR, "backend-store.json");

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function createNutritionFact(input: {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fibreGrams?: number;
  servingSize?: number | null;
  servingUnit?: string | null;
}): LocalNutritionFact {
  const timestamp = nowIso();

  return {
    id: createId("nf"),
    calories: input.calories,
    proteinGrams: input.proteinGrams,
    carbsGrams: input.carbsGrams,
    fatGrams: input.fatGrams,
    fibreGrams: input.fibreGrams ?? 0,
    servingSize: input.servingSize ?? 100,
    servingUnit: input.servingUnit ?? "g",
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

const seedFoods = [
  {
    name: "Chicken breast, grilled",
    category: "protein",
    nutrition: { calories: 165, proteinGrams: 31, carbsGrams: 0, fatGrams: 3.6, fibreGrams: 0 }
  },
  {
    name: "Rolled oats",
    category: "carbs",
    nutrition: { calories: 389, proteinGrams: 16.9, carbsGrams: 66.3, fatGrams: 6.9, fibreGrams: 10.6 }
  },
  {
    name: "Banana",
    category: "fruit",
    nutrition: { calories: 89, proteinGrams: 1.1, carbsGrams: 22.8, fatGrams: 0.3, fibreGrams: 2.6 }
  },
  {
    name: "Greek yoghurt",
    category: "dairy",
    nutrition: { calories: 97, proteinGrams: 10, carbsGrams: 3.6, fatGrams: 5, fibreGrams: 0 }
  },
  {
    name: "Cooked white rice",
    category: "carbs",
    nutrition: { calories: 130, proteinGrams: 2.7, carbsGrams: 28, fatGrams: 0.3, fibreGrams: 0.4 }
  },
  {
    name: "Salmon fillet",
    category: "protein",
    nutrition: { calories: 208, proteinGrams: 20, carbsGrams: 0, fatGrams: 13, fibreGrams: 0 }
  },
  {
    name: "Egg",
    category: "protein",
    nutrition: { calories: 155, proteinGrams: 13, carbsGrams: 1.1, fatGrams: 11, fibreGrams: 0 }
  },
  {
    name: "Apple",
    category: "fruit",
    nutrition: { calories: 52, proteinGrams: 0.3, carbsGrams: 14, fatGrams: 0.2, fibreGrams: 2.4 }
  },
  {
    name: "Cottage cheese",
    category: "dairy",
    nutrition: { calories: 98, proteinGrams: 11.1, carbsGrams: 3.4, fatGrams: 4.3, fibreGrams: 0 }
  },
  {
    name: "Wholemeal bread",
    category: "bakery",
    nutrition: { calories: 247, proteinGrams: 13, carbsGrams: 41, fatGrams: 4.2, fibreGrams: 7 }
  }
] as const;

function createSeedFoods() {
  return seedFoods.map((food) => {
    const nutritionFact = createNutritionFact(food.nutrition);
    const timestamp = nowIso();

    return {
      id: createId("food"),
      slug: slugify(food.name, { lower: true, strict: true }),
      name: food.name,
      brand: null,
      category: food.category,
      searchVector: food.name.toLowerCase(),
      nutritionFactId: nutritionFact.id,
      nutritionFact,
      imageUrl: null,
      createdAt: timestamp,
      updatedAt: timestamp
    } satisfies LocalFood;
  });
}

function createEmptyStore(): LocalBackendStore {
  return {
    version: 1,
    users: [],
    profiles: [],
    goals: [],
    preferences: [],
    foods: createSeedFoods(),
    brandedFoods: [],
    favourites: [],
    meals: [],
    workouts: [],
    progressEntries: []
  };
}

function ensureStoreFile() {
  if (!existsSync(LOCAL_STORE_DIR)) {
    mkdirSync(LOCAL_STORE_DIR, { recursive: true });
  }

  if (!existsSync(LOCAL_STORE_PATH)) {
    writeFileSync(LOCAL_STORE_PATH, JSON.stringify(createEmptyStore(), null, 2));
  }
}

function readStore(): LocalBackendStore {
  ensureStoreFile();

  try {
    const raw = readFileSync(LOCAL_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as LocalBackendStore;

    if (parsed.foods.length === 0) {
      parsed.foods = createSeedFoods();
      writeStore(parsed);
    }

    return parsed;
  } catch (error) {
    logger.warn({ err: error }, "Failed to read local backend store. Recreating it.");
    const nextStore = createEmptyStore();
    writeStore(nextStore);
    return nextStore;
  }
}

function writeStore(store: LocalBackendStore) {
  ensureStoreFile();
  writeFileSync(LOCAL_STORE_PATH, JSON.stringify(store, null, 2));
}

function queryStore<T>(reader: (store: LocalBackendStore) => T): T {
  return reader(readStore());
}

function mutateStore<T>(writer: (store: LocalBackendStore) => T): T {
  const store = readStore();
  const result = writer(store);
  writeStore(store);
  return result;
}

function cloneFoodForResponse(food: LocalFood) {
  return {
    ...food,
    nutritionFact: {
      ...food.nutritionFact
    }
  };
}

function getServingFromString(servingSize?: string) {
  if (!servingSize?.trim()) {
    return { servingSize: 100, servingUnit: "g" };
  }

  const match = servingSize.trim().match(/^([\d.]+)\s*(.*)$/);
  if (!match) {
    return {
      servingSize: 1,
      servingUnit: servingSize.trim()
    };
  }

  return {
    servingSize: Number(match[1]) || 1,
    servingUnit: match[2]?.trim() || "serving"
  };
}

function buildServingLabel(nutritionFact: LocalNutritionFact) {
  if (nutritionFact.servingSize && nutritionFact.servingUnit) {
    return `${nutritionFact.servingSize} ${nutritionFact.servingUnit}`;
  }

  if (nutritionFact.servingUnit) {
    return nutritionFact.servingUnit;
  }

  return "100 g";
}

function mapFoodSearchResult(food: LocalFood): FoodSearchResult {
  return {
    id: food.id,
    name: food.name,
    brand: food.brand,
    servingSize: buildServingLabel(food.nutritionFact),
    source: "local",
    sourceLabel: food.category ? `Saved ${food.category}` : "Saved foods",
    calories: food.nutritionFact.calories,
    proteinGrams: food.nutritionFact.proteinGrams,
    carbsGrams: food.nutritionFact.carbsGrams,
    fatGrams: food.nutritionFact.fatGrams,
    fibreGrams: food.nutritionFact.fibreGrams,
    barcode: null,
    imageUrl: food.imageUrl
  };
}

function getUserOrThrow(store: LocalBackendStore, userId: string) {
  const user = store.users.find((entry) => entry.id === userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
}

function getProfileForGoal(store: LocalBackendStore, userId: string) {
  const profile = store.profiles.find((entry) => entry.userId === userId);
  if (!profile?.currentWeightKg || !profile.heightCm || !profile.dateOfBirth) {
    throw new ApiError(400, "Profile must include date of birth, height, and current weight");
  }

  return profile;
}

function createGoalFromProfile(profile: LocalUserProfile, goalType: GoalTypeValue) {
  const age = dayjs().diff(profile.dateOfBirth, "year");
  const calculated = calculateCalorieGoal({
    sex: profile.sex ?? Sex.undisclosed,
    age,
    heightCm: profile.heightCm!,
    weightKg: profile.currentWeightKg!,
    activityLevel: profile.activityLevel ?? ActivityLevel.moderate,
    goalType
  });

  const weeklyWeightDelta =
    goalType === GoalType.lose ? -0.4 : goalType === GoalType.gain ? 0.25 : 0;

  const timestamp = nowIso();

  return {
    id: createId("goal"),
    userId: profile.userId,
    goalType,
    ...calculated,
    weeklyWeightDelta,
    createdAt: timestamp,
    updatedAt: timestamp
  } satisfies LocalGoal;
}

function sortByDateDesc<T>(items: T[], selector: (item: T) => string) {
  return [...items].sort((left, right) => selector(right).localeCompare(selector(left)));
}

export class LocalBackendStoreService {
  async register(email: string, password: string, displayName: string) {
    const existingUser = queryStore((store) => store.users.find((entry) => entry.email === email));
    if (existingUser) {
      throw new ApiError(409, "An account with that email already exists");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    return mutateStore((store) => {
      const timestamp = nowIso();
      const userId = createId("user");

      store.users.push({
        id: userId,
        email,
        passwordHash,
        displayName,
        isEmailVerified: false,
        createdAt: timestamp,
        updatedAt: timestamp
      });

      store.profiles.push({
        id: createId("profile"),
        userId,
        dateOfBirth: null,
        sex: Sex.undisclosed,
        heightCm: null,
        currentWeightKg: null,
        targetWeightKg: null,
        activityLevel: ActivityLevel.moderate,
        timezone: "Europe/London",
        locale: "en-GB",
        avatarUrl: null,
        onboardingDone: false,
        createdAt: timestamp,
        updatedAt: timestamp
      });

      return {
        id: userId,
        email,
        displayName
      };
    });
  }

  async login(email: string, password: string) {
    const user = queryStore((store) => store.users.find((entry) => entry.email === email));
    if (!user) {
      throw new ApiError(401, "Invalid login details");
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new ApiError(401, "Invalid login details");
    }

    return user;
  }

  getUserById(userId: string) {
    return queryStore((store) => store.users.find((entry) => entry.id === userId) ?? null);
  }

  getProfileResponse(userId: string) {
    return queryStore((store) => {
      const user = getUserOrThrow(store, userId);

      return {
        ...user,
        profile: store.profiles.find((entry) => entry.userId === userId) ?? null,
        goal: store.goals.find((entry) => entry.userId === userId) ?? null,
        preferences: store.preferences.filter((entry) => entry.userId === userId)
      };
    });
  }

  upsertProfile(userId: string, input: ProfileInput) {
    return mutateStore((store) => {
      const user = getUserOrThrow(store, userId);
      const timestamp = nowIso();

      if (input.displayName) {
        user.displayName = input.displayName;
        user.updatedAt = timestamp;
      }

      const existingProfile = store.profiles.find((entry) => entry.userId === userId);
      if (existingProfile) {
        existingProfile.dateOfBirth = input.dateOfBirth ?? existingProfile.dateOfBirth;
        existingProfile.sex = input.sex ?? existingProfile.sex;
        existingProfile.heightCm = input.heightCm ?? existingProfile.heightCm;
        existingProfile.currentWeightKg = input.currentWeightKg ?? existingProfile.currentWeightKg;
        existingProfile.targetWeightKg = input.targetWeightKg ?? existingProfile.targetWeightKg;
        existingProfile.activityLevel = input.activityLevel ?? existingProfile.activityLevel;
        existingProfile.timezone = input.timezone ?? existingProfile.timezone;
        existingProfile.locale = input.locale ?? existingProfile.locale;
        existingProfile.onboardingDone = input.onboardingDone ?? existingProfile.onboardingDone;
        existingProfile.updatedAt = timestamp;
      } else {
        store.profiles.push({
          id: createId("profile"),
          userId,
          dateOfBirth: input.dateOfBirth ?? null,
          sex: input.sex ?? Sex.undisclosed,
          heightCm: input.heightCm ?? null,
          currentWeightKg: input.currentWeightKg ?? null,
          targetWeightKg: input.targetWeightKg ?? null,
          activityLevel: input.activityLevel ?? ActivityLevel.moderate,
          timezone: input.timezone ?? "Europe/London",
          locale: input.locale ?? "en-GB",
          avatarUrl: null,
          onboardingDone: input.onboardingDone ?? false,
          createdAt: timestamp,
          updatedAt: timestamp
        });
      }

      if (input.preferences) {
        store.preferences = store.preferences.filter((entry) => entry.userId !== userId);
        for (const preference of input.preferences) {
          store.preferences.push({
            id: createId("pref"),
            userId,
            type: preference.type,
            value: preference.value,
            createdAt: timestamp
          });
        }
      }

      return this.getProfileResponse(userId);
    });
  }

  saveGoal(userId: string, goalType: GoalTypeValue) {
    return mutateStore((store) => {
      getUserOrThrow(store, userId);
      const profile = getProfileForGoal(store, userId);
      const nextGoal = createGoalFromProfile(profile, goalType);
      const existingIndex = store.goals.findIndex((entry) => entry.userId === userId);

      if (existingIndex >= 0) {
        store.goals[existingIndex] = {
          ...store.goals[existingIndex],
          ...nextGoal,
          id: store.goals[existingIndex].id,
          createdAt: store.goals[existingIndex].createdAt,
          updatedAt: nowIso()
        };
        return store.goals[existingIndex];
      }

      store.goals.push(nextGoal);
      return nextGoal;
    });
  }

  getCurrentGoal(userId: string) {
    return queryStore((store) => {
      const goal = store.goals.find((entry) => entry.userId === userId);
      if (!goal) {
        throw new ApiError(404, "Goal not found");
      }

      return goal;
    });
  }

  searchFoods(query: string, limit: number) {
    return queryStore((store) => {
      const trimmedQuery = query.trim().toLowerCase();
      if (!trimmedQuery) {
        return [];
      }

      return store.foods
        .filter((food) => {
          const haystack = [food.name, food.brand ?? "", food.category ?? "", food.searchVector ?? ""].join(" ").toLowerCase();
          return haystack.includes(trimmedQuery);
        })
        .slice(0, limit)
        .map(mapFoodSearchResult);
    });
  }

  getFoodById(foodId: string) {
    return queryStore((store) => {
      const food = store.foods.find((entry) => entry.id === foodId);
      return food ? cloneFoodForResponse(food) : null;
    });
  }

  getFoodBySlug(slug: string) {
    return queryStore((store) => store.foods.find((entry) => entry.slug === slug) ?? null);
  }

  findBrandedFoodByBarcode(barcode: string) {
    return queryStore((store) => store.brandedFoods.find((entry) => entry.barcode === barcode) ?? null);
  }

  importFood(input: ImportedFoodInput) {
    return mutateStore((store) => {
      if (input.barcode) {
        const brandedFood = store.brandedFoods.find((entry) => entry.barcode === input.barcode);
        if (brandedFood?.foodId) {
          const linkedFood = store.foods.find((entry) => entry.id === brandedFood.foodId);
          if (linkedFood) {
            return cloneFoodForResponse(linkedFood);
          }
        }
      }

      const brandPart = input.brand ? `-${input.brand}` : "";
      const baseSlug = slugify(`${input.name}${brandPart}`, { lower: true, strict: true }) || "food";
      let slug = baseSlug;
      let suffix = 1;

      while (store.foods.some((entry) => entry.slug === slug)) {
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
      }

      const serving = getServingFromString(input.servingSize);
      const nutritionFact = createNutritionFact({
        calories: input.calories,
        proteinGrams: input.proteinGrams,
        carbsGrams: input.carbsGrams,
        fatGrams: input.fatGrams,
        fibreGrams: input.fibreGrams ?? 0,
        servingSize: serving.servingSize,
        servingUnit: serving.servingUnit
      });
      const timestamp = nowIso();
      const food: LocalFood = {
        id: createId("food"),
        slug,
        name: input.name,
        brand: input.brand ?? null,
        category: input.sourceLabel ? slugify(input.sourceLabel, { lower: true, strict: true }) : "imported",
        searchVector: [input.name, input.brand].filter(Boolean).join(" "),
        nutritionFactId: nutritionFact.id,
        nutritionFact,
        imageUrl: null,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      store.foods.push(food);

      if (input.barcode) {
        store.brandedFoods.push({
          id: createId("brand"),
          barcode: input.barcode,
          brandName: input.brand ?? "Unknown brand",
          productName: input.name,
          nutritionFactId: nutritionFact.id,
          nutritionFact,
          foodId: food.id,
          source: input.sourceLabel ?? "imported",
          createdAt: timestamp,
          updatedAt: timestamp
        });
      }

      return cloneFoodForResponse(food);
    });
  }

  storeBrandedBarcodeProduct(input: {
    barcode: string;
    productName: string;
    brandName: string;
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    fibreGrams: number;
    source?: string;
  }) {
    return mutateStore((store) => {
      const timestamp = nowIso();
      const nutritionFact = createNutritionFact({
        calories: input.calories,
        proteinGrams: input.proteinGrams,
        carbsGrams: input.carbsGrams,
        fatGrams: input.fatGrams,
        fibreGrams: input.fibreGrams
      });
      const food: LocalFood = {
        id: createId("food"),
        slug: `${slugify(input.productName || input.barcode, { lower: true, strict: true }) || "food"}-${input.barcode}`,
        name: input.productName || "Unknown product",
        brand: input.brandName || null,
        category: "branded",
        searchVector: [input.productName, input.brandName].filter(Boolean).join(" "),
        nutritionFactId: nutritionFact.id,
        nutritionFact,
        imageUrl: null,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      store.foods.push(food);

      const brandedFood: LocalBrandedFood = {
        id: createId("brand"),
        barcode: input.barcode,
        brandName: input.brandName,
        productName: input.productName,
        nutritionFactId: nutritionFact.id,
        nutritionFact,
        foodId: food.id,
        source: input.source ?? "open_food_facts",
        createdAt: timestamp,
        updatedAt: timestamp
      };

      store.brandedFoods.push(brandedFood);
      return {
        ...brandedFood,
        food: cloneFoodForResponse(food)
      };
    });
  }

  addFavourite(userId: string, foodId?: string, recipeId?: string) {
    return mutateStore((store) => {
      getUserOrThrow(store, userId);

      if ((!foodId && !recipeId) || (foodId && recipeId)) {
        throw new ApiError(400, "Provide either foodId or recipeId");
      }

      if (foodId && !store.foods.some((entry) => entry.id === foodId)) {
        throw new ApiError(404, "Food not found");
      }

      const existing = store.favourites.find(
        (entry) => entry.userId === userId && entry.foodId === (foodId ?? null) && entry.recipeId === (recipeId ?? null)
      );
      if (existing) {
        return existing;
      }

      const favourite = {
        id: createId("fav"),
        userId,
        foodId: foodId ?? null,
        recipeId: recipeId ?? null,
        createdAt: nowIso()
      };

      store.favourites.push(favourite);
      return favourite;
    });
  }

  removeFavourite(userId: string, foodId?: string, recipeId?: string) {
    return mutateStore((store) => {
      if ((!foodId && !recipeId) || (foodId && recipeId)) {
        throw new ApiError(400, "Provide either foodId or recipeId");
      }

      const beforeCount = store.favourites.length;
      store.favourites = store.favourites.filter(
        (entry) => !(entry.userId === userId && entry.foodId === (foodId ?? null) && entry.recipeId === (recipeId ?? null))
      );

      return {
        success: true,
        removed: beforeCount !== store.favourites.length
      };
    });
  }

  listFavourites(userId: string) {
    return queryStore((store) =>
      sortByDateDesc(
        store.favourites
          .filter((entry) => entry.userId === userId)
          .map((entry) => ({
            ...entry,
            food: entry.foodId ? store.foods.find((food) => food.id === entry.foodId) ?? null : null,
            recipe: null
          })),
        (entry) => entry.createdAt
      ).map((entry) => ({
        ...entry,
        food: entry.food ? cloneFoodForResponse(entry.food) : null
      }))
    );
  }

  listRecentFoods(userId: string) {
    return queryStore((store) => {
      const seen = new Set<string>();
      const foods = sortByDateDesc(
        store.meals
          .filter((meal) => meal.userId === userId)
          .flatMap((meal) => meal.items)
          .filter((item) => item.foodId)
          .map((item) => ({
            createdAt: item.createdAt,
            food: store.foods.find((food) => food.id === item.foodId) ?? null
          }))
          .filter((entry) => Boolean(entry.food)),
        (entry) => entry.createdAt
      );

      return foods
        .map((entry) => entry.food)
        .filter((food): food is LocalFood => Boolean(food))
        .filter((food) => {
          if (seen.has(food.id)) {
            return false;
          }

          seen.add(food.id);
          return true;
        })
        .slice(0, 10)
        .map(cloneFoodForResponse);
    });
  }

  createMeal(userId: string, input: CreateMealInput) {
    return mutateStore((store) => {
      getUserOrThrow(store, userId);

      const payloadItems = input.items.map((item) => {
        if (!item.foodId && !item.recipeId) {
          throw new ApiError(400, "Each meal item must reference a food or recipe");
        }

        if (!item.foodId) {
          throw new ApiError(400, "Recipe logging is not available in local mode");
        }

        const food = store.foods.find((entry) => entry.id === item.foodId);
        if (!food) {
          throw new ApiError(404, "Food not found");
        }

        return {
          displayName: food.name,
          foodId: food.id,
          recipeId: null,
          nutritionFactId: food.nutritionFactId,
          nutritionFact: food.nutritionFact,
          portionCount: item.portionCount ?? 1,
          scaled: scaleNutrition(food.nutritionFact, item.portionCount ?? 1)
        };
      });

      const totals = rollupNutrition(payloadItems.map((item) => item.scaled));
      const timestamp = nowIso();
      const mealId = createId("meal");
      const meal: LocalMealLog = {
        id: mealId,
        userId,
        consumedAt: new Date(input.consumedAt).toISOString(),
        mealType: input.mealType,
        notes: input.notes ?? null,
        totalCalories: totals.calories,
        totalProtein: totals.proteinGrams,
        totalCarbs: totals.carbsGrams,
        totalFat: totals.fatGrams,
        totalFibre: totals.fibreGrams,
        createdAt: timestamp,
        updatedAt: timestamp,
        items: payloadItems.map((item) => ({
          id: createId("meal_item"),
          mealLogId: mealId,
          foodId: item.foodId,
          recipeId: item.recipeId,
          nutritionFactId: item.nutritionFactId,
          nutritionFact: item.nutritionFact,
          portionCount: item.portionCount,
          displayName: item.displayName,
          createdAt: timestamp
        }))
      };

      store.meals.push(meal);
      return this.expandMeal(store, meal);
    });
  }

  getDailyMeals(userId: string, date: string) {
    return queryStore((store) =>
      store.meals
        .filter((meal) => meal.userId === userId && dayjs(meal.consumedAt).format("YYYY-MM-DD") === dayjs(date).format("YYYY-MM-DD"))
        .sort((left, right) => left.consumedAt.localeCompare(right.consumedAt))
        .map((meal) => this.expandMeal(store, meal))
    );
  }

  removeMeal(userId: string, mealId: string) {
    return mutateStore((store) => {
      const beforeCount = store.meals.length;
      store.meals = store.meals.filter((meal) => !(meal.id === mealId && meal.userId === userId));

      if (beforeCount === store.meals.length) {
        throw new ApiError(404, "Meal not found");
      }

      return {
        success: true,
        deletedMealId: mealId
      };
    });
  }

  listWorkouts(userId: string) {
    return queryStore((store) =>
      sortByDateDesc(
        store.workouts.filter((entry) => entry.userId === userId),
        (entry) => entry.performedAt
      ).slice(0, 20)
    );
  }

  createWorkout(userId: string, input: CreateWorkoutInput) {
    return mutateStore((store) => {
      getUserOrThrow(store, userId);

      const workout = {
        id: createId("workout"),
        userId,
        title: input.title,
        caloriesBurned: input.caloriesBurned ?? null,
        durationMin: input.durationMin ?? null,
        performedAt: new Date(input.performedAt).toISOString(),
        notes: input.notes ?? null,
        createdAt: nowIso()
      } satisfies LocalWorkout;

      store.workouts.push(workout);
      return workout;
    });
  }

  listProgressEntries(userId: string) {
    return queryStore((store) =>
      sortByDateDesc(
        store.progressEntries.filter((entry) => entry.userId === userId),
        (entry) => entry.recordedAt
      ).slice(0, 30)
    );
  }

  createProgressEntry(userId: string, input: CreateProgressInput) {
    return mutateStore((store) => {
      getUserOrThrow(store, userId);

      const entry = {
        id: createId("progress"),
        userId,
        weightKg: input.weightKg ?? null,
        bodyFatPct: input.bodyFatPct ?? null,
        mood: input.mood ?? null,
        note: input.note ?? null,
        recordedAt: new Date(input.recordedAt).toISOString(),
        createdAt: nowIso()
      } satisfies LocalProgressEntry;

      store.progressEntries.push(entry);
      return entry;
    });
  }

  getDashboard(userId: string, date: string) {
    return queryStore((store) => {
      const dayKey = dayjs(date).format("YYYY-MM-DD");
      const meals = store.meals
        .filter((meal) => meal.userId === userId && dayjs(meal.consumedAt).format("YYYY-MM-DD") === dayKey)
        .sort((left, right) => left.consumedAt.localeCompare(right.consumedAt));
      const workouts = store.workouts
        .filter((workout) => workout.userId === userId && dayjs(workout.performedAt).format("YYYY-MM-DD") === dayKey)
        .sort((left, right) => left.performedAt.localeCompare(right.performedAt));
      const latestProgress = sortByDateDesc(
        store.progressEntries.filter((entry) => entry.userId === userId),
        (entry) => entry.recordedAt
      ).slice(0, 8);
      const goal = store.goals.find((entry) => entry.userId === userId) ?? null;

      const daily = meals.reduce(
        (acc, meal) => ({
          calories: acc.calories + meal.totalCalories,
          protein: acc.protein + meal.totalProtein,
          carbs: acc.carbs + meal.totalCarbs,
          fat: acc.fat + meal.totalFat,
          fibre: acc.fibre + meal.totalFibre
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 }
      );

      const weekStart = dayjs(date).startOf("week");
      const weeklyTrend = Array.from({ length: 7 }, (_unused, index) => {
        const currentDay = weekStart.add(index, "day");
        const currentKey = currentDay.format("YYYY-MM-DD");
        const calories = store.meals
          .filter((meal) => meal.userId === userId && dayjs(meal.consumedAt).format("YYYY-MM-DD") === currentKey)
          .reduce((sum, meal) => sum + meal.totalCalories, 0);

        return {
          day: currentKey,
          calories
        };
      });

      const caloriesBurned = workouts.reduce((sum, workout) => sum + (workout.caloriesBurned ?? 0), 0);

      return {
        date,
        daily,
        goal,
        remainingCalories: goal ? goal.dailyCalories - daily.calories : null,
        caloriesBurned,
        netCalories: daily.calories - caloriesBurned,
        mealCount: meals.length,
        workoutCount: workouts.length,
        meals: meals.map((meal) => this.expandMeal(store, meal)),
        workouts,
        weeklyTrend,
        latestProgress
      };
    });
  }

  private expandMeal(store: LocalBackendStore, meal: LocalMealLog) {
    return {
      ...meal,
      items: meal.items.map((item) => ({
        id: item.id,
        displayName: item.displayName,
        portionCount: item.portionCount,
        food: item.foodId ? cloneFoodForResponse(store.foods.find((food) => food.id === item.foodId)!) : null,
        recipe: null
      }))
    };
  }
}

export const localBackend = new LocalBackendStoreService();
