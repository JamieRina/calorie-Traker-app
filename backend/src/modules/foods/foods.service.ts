import { Prisma } from "@prisma/client";
import slugify from "slugify";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { redis } from "../../config/redis";
import { ApiError } from "../../lib/api-error";
import { localBackend } from "../../lib/local-backend";
import { withLocalFallback } from "../../lib/local-fallback";
import { logger } from "../../config/logger";
import {
  type BrandedFoodRecord,
  type FavouriteListRecord,
  type FavouriteRecord,
  type FoodRecord
} from "../../lib/service-contracts";

type LocalFoodRecord = Prisma.FoodGetPayload<{
  include: {
    nutritionFact: true;
  };
}>;

interface FoodSearchResult {
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
}

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

interface OpenFoodFactsProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  nutriments?: Record<string, number | string | undefined>;
}

interface OpenFoodFactsProductResponse {
  product?: OpenFoodFactsProduct;
}

type UsdaFoodNutrient = {
  nutrientId?: number;
  nutrientName?: string;
  unitName?: string;
  value?: number;
  amount?: number;
  nutrient?: {
    id?: number;
    name?: string;
    unitName?: string;
  };
};

interface UsdaFoodItem {
  fdcId?: number;
  description?: string;
  brandOwner?: string;
  brandName?: string;
  dataType?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: UsdaFoodNutrient[];
}

interface UsdaSearchResponse {
  foods?: UsdaFoodItem[];
}

function buildBarcodeFoodSlug(productName: string, barcode: string) {
  const baseSlug = slugify(productName || barcode, { lower: true, strict: true }) || "food";
  return `${baseSlug}-${barcode}`;
}

function getOpenFoodFactsHeaders() {
  return {
    Accept: "application/json",
    "User-Agent": env.OPEN_FOOD_FACTS_USER_AGENT
  };
}

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function roundNutrition(value: number) {
  return Math.round(value * 10) / 10;
}

function normaliseServingSize(servingSize?: string | null, fallbackSize?: number | null, fallbackUnit?: string | null) {
  if (servingSize?.trim()) {
    return servingSize.trim();
  }

  if (fallbackSize && fallbackUnit) {
    return `${fallbackSize} ${fallbackUnit}`;
  }

  if (fallbackSize) {
    return `${fallbackSize} serving`;
  }

  return "100 g";
}

function mapLocalFood(food: LocalFoodRecord): FoodSearchResult {
  return {
    id: food.id,
    name: food.name,
    brand: food.brand ?? null,
    servingSize: normaliseServingSize(undefined, food.nutritionFact.servingSize, food.nutritionFact.servingUnit),
    source: "local",
    sourceLabel: food.category ? `Saved ${food.category}` : "Saved foods",
    calories: food.nutritionFact.calories,
    proteinGrams: food.nutritionFact.proteinGrams,
    carbsGrams: food.nutritionFact.carbsGrams,
    fatGrams: food.nutritionFact.fatGrams,
    fibreGrams: food.nutritionFact.fibreGrams ?? 0,
    barcode: null,
    imageUrl: null
  };
}

function getUsdaNutrientValue(food: UsdaFoodItem, nutrientId: number, nameMatchers: string[]) {
  const nutrient = food.foodNutrients?.find((item) => {
    const id = item.nutrientId ?? item.nutrient?.id;
    if (id === nutrientId) {
      return true;
    }

    const name = (item.nutrientName ?? item.nutrient?.name ?? "").toLowerCase();
    return nameMatchers.some((matcher) => name.includes(matcher));
  });

  return toNumber(nutrient?.value ?? nutrient?.amount);
}

function getUsdaServing(food: UsdaFoodItem) {
  const size = toNumber(food.servingSize);
  const unit = food.servingSizeUnit?.trim();
  const household = food.householdServingFullText?.trim();
  const unitLower = unit?.toLowerCase() ?? "";
  const canScaleByWeight = size > 0 && (unitLower === "g" || unitLower === "gram" || unitLower === "grams");
  const multiplier = canScaleByWeight ? size / 100 : 1;

  if (size > 0 && unit) {
    return {
      label: `${size} ${unit}`,
      multiplier
    };
  }

  if (household) {
    return {
      label: household,
      multiplier
    };
  }

  return {
    label: "100 g",
    multiplier: 1
  };
}

function mapUsdaFood(food: UsdaFoodItem): FoodSearchResult | null {
  const fdcId = food.fdcId;
  const name = food.description?.trim();
  if (!fdcId || !name) {
    return null;
  }

  const serving = getUsdaServing(food);
  const brand = food.brandOwner?.trim() || food.brandName?.trim() || null;
  const calories = getUsdaNutrientValue(food, 1008, ["energy"]);
  const protein = getUsdaNutrientValue(food, 1003, ["protein"]);
  const carbs = getUsdaNutrientValue(food, 1005, ["carbohydrate"]);
  const fat = getUsdaNutrientValue(food, 1004, ["total lipid", "fat"]);
  const fibre = getUsdaNutrientValue(food, 1079, ["fiber", "fibre"]);

  return {
    id: `usda-${fdcId}`,
    name,
    brand,
    servingSize: serving.label,
    source: "usda",
    sourceLabel: food.dataType ? `USDA ${food.dataType}` : "USDA FoodData Central",
    calories: roundNutrition(calories * serving.multiplier),
    proteinGrams: roundNutrition(protein * serving.multiplier),
    carbsGrams: roundNutrition(carbs * serving.multiplier),
    fatGrams: roundNutrition(fat * serving.multiplier),
    fibreGrams: roundNutrition(fibre * serving.multiplier),
    barcode: null,
    imageUrl: null
  };
}

function dedupeFoods(foods: FoodSearchResult[], limit: number) {
  const seen = new Set<string>();

  return foods
    .filter((food) => {
      const key = `${food.name.trim().toLowerCase()}::${food.brand?.trim().toLowerCase() ?? ""}`;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

export class FoodsService {
  async searchFoods(query: string, limit = 10) {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return [];
    }

    const cacheKey = `foods:search:${trimmedQuery.toLowerCase()}:${limit}`;
    const useCache = env.LOCAL_BACKEND_MODE !== "force_local";

    if (useCache) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as FoodSearchResult[];
        }
      } catch (error) {
        logger.warn({ err: error, cacheKey }, "Food search cache read failed");
      }
    }

    const result = await withLocalFallback(
      "foods.search",
      async () => {
        const foods = await prisma.food.findMany({
          where: {
            OR: [
              { name: { contains: trimmedQuery, mode: "insensitive" } },
              { brand: { contains: trimmedQuery, mode: "insensitive" } }
            ]
          },
          include: {
            nutritionFact: true
          },
          take: limit
        });

        const localResults = foods.map(mapLocalFood);
        const usdaResults =
          localResults.length >= limit || trimmedQuery.length < 2
            ? []
            : await this.searchUsdaFoods(trimmedQuery, Math.min(Math.max(limit * 2, 8), 25), localResults);

        return dedupeFoods([...localResults, ...usdaResults], limit);
      },
      async () => {
        const localResults = localBackend.searchFoods(trimmedQuery, limit);
        const usdaResults =
          localResults.length >= limit || trimmedQuery.length < 2
            ? []
            : await this.searchUsdaFoods(trimmedQuery, Math.min(Math.max(limit * 2, 8), 25), localResults);

        return dedupeFoods([...localResults, ...usdaResults], limit);
      }
    );

    if (useCache) {
      try {
        await redis.set(cacheKey, JSON.stringify(result), "EX", 300);
      } catch (error) {
        logger.warn({ err: error, cacheKey }, "Food search cache write failed");
      }
    }

    return result;
  }

  async barcodeLookup(barcode: string) {
    return withLocalFallback<BrandedFoodRecord>(
      "foods.barcodeLookup",
      async () => {
        const existing = await prisma.brandedFood.findUnique({
          where: { barcode },
          include: { nutritionFact: true, food: { include: { nutritionFact: true } } }
        });

        if (existing) {
          return existing;
        }

        const response = await fetch(`${env.OPEN_FOOD_FACTS_BASE_URL}/api/v2/product/${barcode}.json`, {
          headers: getOpenFoodFactsHeaders()
        });
        if (!response.ok) {
          throw new ApiError(404, "Barcode not found");
        }

        const data = (await response.json()) as OpenFoodFactsProductResponse;
        const product = data.product;
        if (!product) {
          throw new ApiError(404, "Barcode not found");
        }

        const nutritionFact = await prisma.nutritionFact.create({
          data: {
            calories: Number(product.nutriments?.["energy-kcal_100g"] ?? 0),
            proteinGrams: Number(product.nutriments?.proteins_100g ?? 0),
            carbsGrams: Number(product.nutriments?.carbohydrates_100g ?? 0),
            fatGrams: Number(product.nutriments?.fat_100g ?? 0),
            fibreGrams: Number(product.nutriments?.fiber_100g ?? 0)
          }
        });

        const food = await prisma.food.create({
          data: {
            slug: buildBarcodeFoodSlug(product.product_name || "unknown-product", barcode),
            name: product.product_name || "Unknown product",
            brand: product.brands || null,
            category: "branded",
            nutritionFactId: nutritionFact.id
          }
        });

        return prisma.brandedFood.create({
          data: {
            barcode,
            brandName: product.brands || "Unknown brand",
            productName: product.product_name || "Unknown product",
            nutritionFactId: nutritionFact.id,
            foodId: food.id,
            source: "open_food_facts"
          },
          include: {
            nutritionFact: true,
            food: { include: { nutritionFact: true } }
          }
        });
      },
      async () => {
        const existing = localBackend.findBrandedFoodByBarcode(barcode);
        if (existing) {
          const food = existing.foodId ? localBackend.getFoodById(existing.foodId) : null;
          return {
            ...existing,
            food
          };
        }

        const response = await fetch(`${env.OPEN_FOOD_FACTS_BASE_URL}/api/v2/product/${barcode}.json`, {
          headers: getOpenFoodFactsHeaders()
        });
        if (!response.ok) {
          throw new ApiError(404, "Barcode not found");
        }

        const data = (await response.json()) as OpenFoodFactsProductResponse;
        const product = data.product;
        if (!product) {
          throw new ApiError(404, "Barcode not found");
        }

        return localBackend.storeBrandedBarcodeProduct({
          barcode,
          brandName: product.brands || "Unknown brand",
          productName: product.product_name || "Unknown product",
          calories: Number(product.nutriments?.["energy-kcal_100g"] ?? 0),
          proteinGrams: Number(product.nutriments?.proteins_100g ?? 0),
          carbsGrams: Number(product.nutriments?.carbohydrates_100g ?? 0),
          fatGrams: Number(product.nutriments?.fat_100g ?? 0),
          fibreGrams: Number(product.nutriments?.fiber_100g ?? 0),
          source: "open_food_facts"
        });
      }
    );
  }

  async importFood(input: ImportedFoodInput) {
    return withLocalFallback<FoodRecord>(
      "foods.importFood",
      async () => {
        if (input.barcode) {
          const imported = await this.barcodeLookup(input.barcode);
          if (imported.food) {
            return prisma.food.findUniqueOrThrow({
              where: { id: imported.food.id },
              include: { nutritionFact: true }
            });
          }
        }

        const brandPart = input.brand ? `-${input.brand}` : "";
        const baseSlug = slugify(`${input.name}${brandPart}`, { lower: true, strict: true }) || "food";
        let slug = baseSlug;
        let duplicateCount = 1;

        while (await prisma.food.findUnique({ where: { slug } })) {
          slug = `${baseSlug}-${duplicateCount}`;
          duplicateCount += 1;
        }

        const nutritionFact = await prisma.nutritionFact.create({
          data: {
            calories: input.calories,
            proteinGrams: input.proteinGrams,
            carbsGrams: input.carbsGrams,
            fatGrams: input.fatGrams,
            fibreGrams: input.fibreGrams ?? 0,
            servingUnit: input.servingSize
          }
        });

        return prisma.food.create({
          data: {
            slug,
            name: input.name,
            brand: input.brand ?? null,
            category: input.sourceLabel ? slugify(input.sourceLabel, { lower: true, strict: true }) : "imported",
            searchVector: [input.name, input.brand].filter(Boolean).join(" "),
            nutritionFactId: nutritionFact.id
          },
          include: {
            nutritionFact: true
          }
        });
      },
      async () => localBackend.importFood(input)
    );
  }

  async addFavourite(userId: string, foodId?: string, recipeId?: string) {
    return withLocalFallback<FavouriteRecord>(
      "foods.addFavourite",
      async () => {
        if ((!foodId && !recipeId) || (foodId && recipeId)) {
          throw new ApiError(400, "Provide either foodId or recipeId");
        }

        if (foodId) {
          const food = await prisma.food.findUnique({
            where: { id: foodId }
          });
          if (!food) {
            throw new ApiError(404, "Food not found");
          }
        }

        if (recipeId) {
          const recipe = await prisma.recipe.findUnique({
            where: { id: recipeId }
          });
          if (!recipe) {
            throw new ApiError(404, "Recipe not found");
          }
        }

        const existingFavourite = await prisma.favourite.findFirst({
          where: {
            userId,
            foodId: foodId ?? null,
            recipeId: recipeId ?? null
          }
        });

        if (existingFavourite) {
          return existingFavourite;
        }

        return prisma.favourite.create({
          data: {
            userId,
            foodId,
            recipeId
          }
        });
      },
      async () => localBackend.addFavourite(userId, foodId, recipeId)
    );
  }

  async removeFavourite(userId: string, foodId?: string, recipeId?: string) {
    return withLocalFallback(
      "foods.removeFavourite",
      async () => {
        if ((!foodId && !recipeId) || (foodId && recipeId)) {
          throw new ApiError(400, "Provide either foodId or recipeId");
        }

        const result = await prisma.favourite.deleteMany({
          where: {
            userId,
            foodId: foodId ?? null,
            recipeId: recipeId ?? null
          }
        });

        return {
          success: true,
          removed: result.count > 0
        };
      },
      async () => localBackend.removeFavourite(userId, foodId, recipeId)
    );
  }

  async listFavourites(userId: string) {
    return withLocalFallback<FavouriteListRecord[]>(
      "foods.listFavourites",
      async () =>
        prisma.favourite.findMany({
          where: { userId },
          include: {
            food: {
              include: { nutritionFact: true }
            },
            recipe: {
              include: { nutritionFact: true }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        }),
      async () => localBackend.listFavourites(userId)
    );
  }

  async listRecentFoods(userId: string) {
    return withLocalFallback<FoodRecord[]>(
      "foods.listRecentFoods",
      async () => {
        const recentItems = await prisma.mealLogItem.findMany({
          where: {
            mealLog: { userId },
            foodId: { not: null }
          },
          include: {
            food: { include: { nutritionFact: true } }
          },
          orderBy: {
            createdAt: "desc"
          },
          take: 25
        });

        const seen = new Set<string>();

        return recentItems
          .map((item) => item.food)
          .filter((food): food is NonNullable<(typeof recentItems)[number]["food"]> => Boolean(food))
          .filter((food: NonNullable<(typeof recentItems)[number]["food"]>) => {
            if (seen.has(food.id)) {
              return false;
            }
            seen.add(food.id);
            return true;
          })
          .slice(0, 10);
      },
      async () => localBackend.listRecentFoods(userId)
    );
  }

  private async searchUsdaFoods(query: string, limit: number, fallbackResults: FoodSearchResult[]) {
    if (!env.USDA_API_KEY) {
      if (fallbackResults.length > 0) {
        return [];
      }

      throw new ApiError(503, "USDA API key is missing. Paste it into backend/.env on the USDA_API_KEY line.");
    }

    const searchUrl = new URL(`${env.USDA_BASE_URL.replace(/\/$/, "")}/foods/search`);
    searchUrl.searchParams.set("api_key", env.USDA_API_KEY);
    searchUrl.searchParams.set("query", query);
    searchUrl.searchParams.set("pageSize", String(limit));
    searchUrl.searchParams.set("sortBy", "dataType.keyword");
    searchUrl.searchParams.set("sortOrder", "asc");

    try {
      const response = await fetch(searchUrl, {
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new ApiError(401, "USDA API key was rejected. Check the USDA_API_KEY value in backend/.env.");
        }

        if (response.status === 429) {
          throw new ApiError(429, "USDA FoodData Central rate limit reached. Please wait and try again.");
        }

        logger.warn(
          {
            query,
            limit,
            statusCode: response.status
          },
          "USDA FoodData Central search request failed"
        );
        throw new ApiError(502, "USDA FoodData Central search failed. Please try again.");
      }

      const data = (await response.json()) as UsdaSearchResponse;
      return (data.foods ?? [])
        .map(mapUsdaFood)
        .filter((food): food is FoodSearchResult => Boolean(food));
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.warn({ err: error, query, limit }, "USDA FoodData Central search unavailable");

      if (fallbackResults.length > 0) {
        return [];
      }

      throw new ApiError(503, "USDA FoodData Central is unavailable right now. Please try again later.");
    }
  }

  async getUsdaFoodDetail(fdcId: string) {
    if (!env.USDA_API_KEY) {
      throw new ApiError(503, "USDA API key is missing. Paste it into backend/.env on the USDA_API_KEY line.");
    }

    const detailUrl = new URL(`${env.USDA_BASE_URL.replace(/\/$/, "")}/food/${fdcId}`);
    detailUrl.searchParams.set("api_key", env.USDA_API_KEY);

    const response = await fetch(detailUrl, {
      headers: {
        Accept: "application/json"
      }
    });

    if (response.status === 404) {
      throw new ApiError(404, "USDA food not found.");
    }

    if (response.status === 403) {
      throw new ApiError(401, "USDA API key was rejected. Check the USDA_API_KEY value in backend/.env.");
    }

    if (response.status === 429) {
      throw new ApiError(429, "USDA FoodData Central rate limit reached. Please wait and try again.");
    }

    if (!response.ok) {
      throw new ApiError(502, "USDA FoodData Central detail lookup failed.");
    }

    const data = (await response.json()) as UsdaFoodItem;
    const mappedFood = mapUsdaFood(data);
    if (!mappedFood) {
      throw new ApiError(404, "USDA food did not include usable nutrition data.");
    }

    return mappedFood;
  }
}

export const foodsService = new FoodsService();
