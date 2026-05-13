import { z } from "zod";

export const parseRecipeSchema = z.object({
  title: z.string().trim().min(2).max(120),
  sourceText: z.string().trim().min(8).max(6000),
  servings: z.number().int().positive().max(100).default(1)
});

export const createRecipeSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  servings: z.number().int().positive().max(100).default(1),
  sourceText: z.string().trim().max(6000).optional(),
  aiConfidence: z.number().min(0).max(1).optional(),
  nutrition: z.object({
    calories: z.number().min(0).max(10000),
    proteinGrams: z.number().min(0).max(1000),
    carbsGrams: z.number().min(0).max(1000),
    fatGrams: z.number().min(0).max(1000),
    fibreGrams: z.number().min(0).max(250).optional()
  }),
  ingredients: z.array(
    z.object({
      rawText: z.string().trim().min(1).max(240),
      ingredientName: z.string().trim().min(1).max(120),
      amount: z.number().positive().max(10000).optional(),
      unit: z.string().trim().max(40).optional(),
      gramsEstimate: z.number().min(0).max(100000).optional(),
      caloriesEstimate: z.number().min(0).max(10000).optional(),
      confidence: z.number().min(0).max(1).optional()
    })
  ).min(1).max(100)
});
