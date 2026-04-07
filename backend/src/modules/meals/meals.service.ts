import dayjs from "dayjs";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../lib/api-error";
import { localBackend } from "../../lib/local-backend";
import { withLocalFallback } from "../../lib/local-fallback";
import { type MealType } from "../../lib/domain-enums";
import { type MealRecord } from "../../lib/service-contracts";
import { rollupNutrition, scaleNutrition } from "../../utils/nutrition";

type MealsDbClient = Pick<typeof prisma, "food" | "recipe" | "mealLog">;

export type CreateMealInput = {
  consumedAt: string;
  mealType: MealType;
  notes?: string;
  items: Array<{ foodId?: string; recipeId?: string; portionCount?: number }>;
};

export class MealsService {
  async createMeal(userId: string, input: CreateMealInput, db: MealsDbClient = prisma) {
    return withLocalFallback<MealRecord>(
      "meals.create",
      async () => {
        const payloadItems = [];

        for (const item of input.items) {
          if (!item.foodId && !item.recipeId) {
            throw new ApiError(400, "Each meal item must reference a food or recipe");
          }

          if (item.foodId) {
            const food = await db.food.findUnique({
              where: { id: item.foodId },
              include: { nutritionFact: true }
            });

            if (!food) {
              throw new ApiError(404, "Food not found");
            }

            payloadItems.push({
              displayName: food.name,
              foodId: food.id,
              nutritionFactId: food.nutritionFactId,
              portionCount: item.portionCount ?? 1,
              scaled: scaleNutrition(food.nutritionFact, item.portionCount ?? 1)
            });
          }

          if (item.recipeId) {
            const recipe = await db.recipe.findUnique({
              where: { id: item.recipeId },
              include: { nutritionFact: true }
            });

            if (!recipe) {
              throw new ApiError(404, "Recipe not found");
            }

            payloadItems.push({
              displayName: recipe.title,
              recipeId: recipe.id,
              nutritionFactId: recipe.nutritionFactId,
              portionCount: item.portionCount ?? 1,
              scaled: scaleNutrition(recipe.nutritionFact, item.portionCount ?? 1)
            });
          }
        }

        const totals = rollupNutrition(payloadItems.map((item) => item.scaled));

        return db.mealLog.create({
          data: {
            userId,
            consumedAt: new Date(input.consumedAt),
            mealType: input.mealType,
            notes: input.notes,
            totalCalories: totals.calories,
            totalProtein: totals.proteinGrams,
            totalCarbs: totals.carbsGrams,
            totalFat: totals.fatGrams,
            totalFibre: totals.fibreGrams,
            items: {
              create: payloadItems.map((item) => ({
                foodId: item.foodId,
                recipeId: item.recipeId,
                nutritionFactId: item.nutritionFactId,
                portionCount: item.portionCount,
                displayName: item.displayName
              }))
            }
          },
          include: {
            items: {
              include: {
                food: { include: { nutritionFact: true } },
                recipe: { include: { nutritionFact: true } }
              }
            }
          }
        });
      },
      async () => localBackend.createMeal(userId, input)
    );
  }

  async getDailyMeals(userId: string, date: string) {
    return withLocalFallback<MealRecord[]>(
      "meals.daily",
      async () => {
        const day = dayjs(date);
        return prisma.mealLog.findMany({
          where: {
            userId,
            consumedAt: {
              gte: day.startOf("day").toDate(),
              lte: day.endOf("day").toDate()
            }
          },
          include: {
            items: {
              include: {
                food: { include: { nutritionFact: true } },
                recipe: { include: { nutritionFact: true } }
              }
            }
          },
          orderBy: {
            consumedAt: "asc"
          }
        });
      },
      async () => localBackend.getDailyMeals(userId, date)
    );
  }

  async removeMeal(userId: string, mealId: string) {
    return withLocalFallback(
      "meals.remove",
      async () => {
        const meal = await prisma.mealLog.findFirst({
          where: {
            id: mealId,
            userId
          }
        });

        if (!meal) {
          throw new ApiError(404, "Meal not found");
        }

        await prisma.mealLog.delete({
          where: { id: mealId }
        });

        return {
          success: true,
          deletedMealId: mealId
        };
      },
      async () => localBackend.removeMeal(userId, mealId)
    );
  }
}

export const mealsService = new MealsService();
