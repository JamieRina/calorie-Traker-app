import { z } from "zod";

export const searchFoodsQuerySchema = z.object({
  q: z.string().trim().min(1).max(80),
  limit: z.coerce.number().int().positive().max(25).default(10)
});

export const importFoodSchema = z.object({
  name: z.string().trim().min(2).max(120),
  brand: z.string().trim().max(120).optional(),
  servingSize: z.string().trim().max(80).optional(),
  calories: z.number().min(0).max(10000),
  proteinGrams: z.number().min(0).max(1000),
  carbsGrams: z.number().min(0).max(1000),
  fatGrams: z.number().min(0).max(1000),
  fibreGrams: z.number().min(0).max(250).optional(),
  barcode: z.string().trim().regex(/^[0-9A-Za-z-]{6,64}$/).optional(),
  sourceLabel: z.string().trim().max(80).optional()
});

export const favouriteMutationSchema = z
  .object({
    foodId: z.string().min(1).optional(),
    recipeId: z.string().min(1).optional()
  })
  .refine((value) => Boolean(value.foodId) !== Boolean(value.recipeId), {
    message: "Provide either foodId or recipeId"
  });

export const barcodeParamSchema = z.object({
  barcode: z.string().trim().regex(/^[0-9A-Za-z-]{6,64}$/)
});

export const usdaFoodParamSchema = z.object({
  fdcId: z.string().trim().regex(/^\d{1,12}$/)
});
