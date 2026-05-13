import { z } from "zod";
import { MealType } from "../../lib/domain-enums";

export const createMealSchema = z.object({
  consumedAt: z.string().datetime(),
  mealType: z.nativeEnum(MealType),
  notes: z.string().trim().max(500).optional(),
  items: z.array(
    z
      .object({
        foodId: z.string().min(1).optional(),
        recipeId: z.string().min(1).optional(),
        portionCount: z.number().positive().max(20).default(1)
      })
      .refine((value) => Boolean(value.foodId) !== Boolean(value.recipeId), {
        message: "Each meal item must reference either a food or recipe"
      })
  ).min(1).max(20)
});

export const updateMealSchema = z
  .object({
    consumedAt: z.string().datetime().optional(),
    mealType: z.nativeEnum(MealType).optional(),
    notes: z.string().trim().max(500).nullable().optional()
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "Provide at least one meal field to update"
  });

export const dailyMealsQuerySchema = z.object({
  date: z.string().date()
});

export const mealIdParamSchema = z.object({
  mealId: z.string().min(1).max(120)
});
