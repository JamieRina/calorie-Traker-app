import { prisma } from "../../config/prisma";
import { localBackend } from "../../lib/local-backend";
import { withLocalFallback } from "../../lib/local-fallback";
import { type WorkoutRecord } from "../../lib/service-contracts";

type WorkoutsDbClient = Pick<typeof prisma, "workout">;

export type CreateWorkoutInput = {
  title: string;
  caloriesBurned?: number;
  durationMin?: number;
  performedAt: string;
  notes?: string;
};

export class WorkoutsService {
  async create(userId: string, input: CreateWorkoutInput, db: WorkoutsDbClient = prisma) {
    return withLocalFallback<WorkoutRecord>(
      "workouts.create",
      async () =>
        db.workout.create({
          data: {
            userId,
            ...input,
            performedAt: new Date(input.performedAt)
          }
        }),
      async () => localBackend.createWorkout(userId, input)
    );
  }

  async list(userId: string) {
    return withLocalFallback<WorkoutRecord[]>(
      "workouts.list",
      async () =>
        prisma.workout.findMany({
          where: { userId },
          orderBy: { performedAt: "desc" },
          take: 20
        }),
      async () => localBackend.listWorkouts(userId)
    );
  }
}

export const workoutsService = new WorkoutsService();
