import { z } from "zod";

export const searchFoodsQuerySchema = z.object({
  q: z.string().trim().min(1),
  limit: z.coerce.number().int().positive().max(25).default(10)
});

export const importFoodSchema = z.object({
  name: z.string().trim().min(2).max(120),
  brand: z.string().trim().max(120).optional(),
  servingSize: z.string().trim().max(80).optional(),
  calories: z.number().nonnegative(),
  proteinGrams: z.number().nonnegative(),
  carbsGrams: z.number().nonnegative(),
  fatGrams: z.number().nonnegative(),
  fibreGrams: z.number().nonnegative().optional(),
  barcode: z.string().trim().min(6).max(64).optional(),
  sourceLabel: z.string().trim().max(80).optional()
});

export const favouriteMutationSchema = z.object({
  foodId: z.string().optional(),
  recipeId: z.string().optional()
});
