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
  source: "local" | "open_food_facts";
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
  serving_size?: string;
  image_front_small_url?: string;
  image_small_url?: string;
  nutriments?: Record<string, number | string | undefined>;
}

interface OpenFoodFactsSearchResponse {
  products?: OpenFoodFactsProduct[];
}

interface OpenFoodFactsProductResponse {
  product?: OpenFoodFactsProduct;
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

function mapOpenFoodFactsProduct(product: OpenFoodFactsProduct): FoodSearchResult | null {
  const productName = product.product_name?.trim();
  if (!productName) {
    return null;
  }

  const nutriments = product.nutriments ?? {};
  const barcode = product.code?.trim() || null;

  return {
    id: barcode ? `off-${barcode}` : `off-${slugify(productName, { lower: true, strict: true }) || "food"}`,
    name: productName,
    brand: product.brands?.trim() || null,
    servingSize: normaliseServingSize(product.serving_size),
    source: "open_food_facts",
    sourceLabel: "Open Food Facts",
    calories: toNumber(nutriments["energy-kcal_100g"] ?? nutriments["energy-kcal"]),
    proteinGrams: toNumber(nutriments.proteins_100g ?? nutriments.proteins),
    carbsGrams: toNumber(nutriments.carbohydrates_100g ?? nutriments.carbohydrates),
    fatGrams: toNumber(nutriments.fat_100g ?? nutriments.fat),
    fibreGrams: toNumber(nutriments.fiber_100g ?? nutriments.fiber),
    barcode,
    imageUrl: product.image_front_small_url?.trim() || product.image_small_url?.trim() || null
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
        const openFoodFactsResults =
          localResults.length >= limit || trimmedQuery.length < 2
            ? []
            : await this.searchOpenFoodFacts(trimmedQuery, Math.min(Math.max(limit * 2, 8), 20));

        return dedupeFoods([...localResults, ...openFoodFactsResults], limit);
      },
      async () => {
        const localResults = localBackend.searchFoods(trimmedQuery, limit);
        const openFoodFactsResults =
          localResults.length >= limit || trimmedQuery.length < 2
            ? []
            : await this.searchOpenFoodFacts(trimmedQuery, Math.min(Math.max(limit * 2, 8), 20));

        return dedupeFoods([...localResults, ...openFoodFactsResults], limit);
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

  private async searchOpenFoodFacts(query: string, limit: number) {
    const searchUrl = new URL("/cgi/search.pl", env.OPEN_FOOD_FACTS_BASE_URL);
    searchUrl.searchParams.set("action", "process");
    searchUrl.searchParams.set("json", "1");
    searchUrl.searchParams.set("search_terms", query);
    searchUrl.searchParams.set("page_size", String(limit));
    searchUrl.searchParams.set(
      "fields",
      ["code", "product_name", "brands", "serving_size", "image_front_small_url", "image_small_url", "nutriments"].join(",")
    );

    try {
      const response = await fetch(searchUrl, {
        headers: getOpenFoodFactsHeaders()
      });

      if (!response.ok) {
        logger.warn(
          {
            query,
            limit,
            statusCode: response.status
          },
          "Open Food Facts search request failed"
        );
        return [];
      }

      const data = (await response.json()) as OpenFoodFactsSearchResponse;
      return (data.products ?? [])
        .map(mapOpenFoodFactsProduct)
        .filter((food): food is FoodSearchResult => Boolean(food));
    } catch (error) {
      logger.warn({ err: error, query, limit }, "Open Food Facts search unavailable");
      return [];
    }
  }
}

export const foodsService = new FoodsService();
