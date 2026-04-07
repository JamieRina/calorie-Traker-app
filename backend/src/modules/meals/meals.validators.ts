import { z } from "zod";
import { MealType } from "../../lib/domain-enums";

export const createMealSchema = z.object({
  consumedAt: z.string().datetime(),
  mealType: z.nativeEnum(MealType),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      foodId: z.string().optional(),
      recipeId: z.string().optional(),
      portionCount: z.number().positive().default(1)
    })
  ).min(1)
});

export const dailyMealsQuerySchema = z.object({
  date: z.string().date()
});
