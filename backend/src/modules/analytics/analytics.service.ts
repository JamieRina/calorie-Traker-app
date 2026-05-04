import dayjs from "dayjs";
import { prisma } from "../../config/prisma";
import { localBackend } from "../../lib/local-backend";
import { withLocalFallback } from "../../lib/local-fallback";
import { type DashboardResponseRecord } from "../../lib/service-contracts";

type DailyTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
};

export class AnalyticsService {
  async getDashboard(userId: string, date: string) {
    return withLocalFallback<DashboardResponseRecord>(
      "analytics.dashboard",
      async () => {
        const day = dayjs(date);

        const meals = await prisma.mealLog.findMany({
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

        const workouts = await prisma.workout.findMany({
          where: {
            userId,
            performedAt: {
              gte: day.startOf("day").toDate(),
              lte: day.endOf("day").toDate()
            }
          },
          orderBy: {
            performedAt: "asc"
          }
        });

        const progress = await prisma.progressEntry.findMany({
          where: { userId },
          orderBy: { recordedAt: "desc" },
          take: 8
        });

        const goal = await prisma.goal.findUnique({
          where: { userId }
        });

        const daily = meals.reduce<DailyTotals>(
          (acc, meal) => ({
            calories: acc.calories + meal.totalCalories,
            protein: acc.protein + meal.totalProtein,
            carbs: acc.carbs + meal.totalCarbs,
            fat: acc.fat + meal.totalFat,
            fibre: acc.fibre + meal.totalFibre
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 }
        );

        const weekStart = day.startOf("week");
        const weeklyMeals = await prisma.mealLog.findMany({
          where: {
            userId,
            consumedAt: {
              gte: weekStart.toDate(),
              lte: weekStart.add(6, "day").endOf("day").toDate()
            }
          }
        });

        const trendMap = new Map<string, number>();
        for (let i = 0; i < 7; i += 1) {
          trendMap.set(weekStart.add(i, "day").format("YYYY-MM-DD"), 0);
        }
        for (const meal of weeklyMeals) {
          const key = dayjs(meal.consumedAt).format("YYYY-MM-DD");
          trendMap.set(key, (trendMap.get(key) ?? 0) + meal.totalCalories);
        }

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
          meals,
          workouts,
          weeklyTrend: Array.from(trendMap.entries()).map(([dayKey, calories]) => ({
            day: dayKey,
            calories
          })),
          latestProgress: progress
        };
      },
      async () => localBackend.getDashboard(userId, date)
    );
  }
}

export const analyticsService = new AnalyticsService();
