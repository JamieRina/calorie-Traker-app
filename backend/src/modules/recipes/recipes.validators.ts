import { z } from "zod";

export const parseRecipeSchema = z.object({
  title: z.string().min(2),
  sourceText: z.string().min(8),
  servings: z.number().int().positive().default(1)
});

export const createRecipeSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  servings: z.number().int().positive().default(1),
  sourceText: z.string().optional(),
  aiConfidence: z.number().min(0).max(1).optional(),
  nutrition: z.object({
    calories: z.number().nonnegative(),
    proteinGrams: z.number().nonnegative(),
    carbsGrams: z.number().nonnegative(),
    fatGrams: z.number().nonnegative(),
    fibreGrams: z.number().nonnegative().optional()
  }),
  ingredients: z.array(
    z.object({
      rawText: z.string(),
      ingredientName: z.string(),
      amount: z.number().optional(),
      unit: z.string().optional(),
      gramsEstimate: z.number().optional(),
      caloriesEstimate: z.number().optional(),
      confidence: z.number().min(0).max(1).optional()
    })
  ).min(1)
});
