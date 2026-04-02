import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../lib/api-error";
import { SyncStatus } from "../../lib/domain-enums";
import { createMealSchema } from "../meals/meals.validators";
import { mealsService, type CreateMealInput } from "../meals/meals.service";
import { createProgressSchema } from "../progress/progress.validators";
import { progressService, type CreateProgressInput } from "../progress/progress.service";
import { createWorkoutSchema } from "../workouts/workouts.validators";
import { workoutsService, type CreateWorkoutInput } from "../workouts/workouts.service";

type SyncMutationInput = {
  clientMutationId: string;
  entityType: string;
  operation: "create" | "update" | "delete";
  payload: Prisma.InputJsonObject;
};

type SyncDbClient = Pick<typeof prisma, "syncMutation" | "food" | "recipe" | "mealLog" | "progressEntry" | "workout">;

export class SyncService {
  async applyMutations(userId: string, mutations: SyncMutationInput[]) {
    const results = [];

    for (const mutation of mutations) {
      const result = await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
        const existing = await transaction.syncMutation.findUnique({
          where: {
            userId_clientMutationId: {
              userId,
              clientMutationId: mutation.clientMutationId
            }
          }
        });

        if (existing?.status === SyncStatus.applied) {
          return {
            clientMutationId: mutation.clientMutationId,
            status: existing.status,
            reused: true
          };
        }

        const syncMutation = existing
          ? await transaction.syncMutation.update({
              where: { id: existing.id },
              data: {
                entityType: mutation.entityType,
                operation: mutation.operation,
                payloadJson: mutation.payload,
                status: SyncStatus.pending,
                errorMessage: null,
                appliedAt: null
              }
            })
          : await transaction.syncMutation.create({
              data: {
                userId,
                clientMutationId: mutation.clientMutationId,
                entityType: mutation.entityType,
                operation: mutation.operation,
                payloadJson: mutation.payload,
                status: SyncStatus.pending
              }
            });

        try {
          const resourceId = await this.applyMutation(transaction, userId, mutation);

          await transaction.syncMutation.update({
            where: { id: syncMutation.id },
            data: {
              status: SyncStatus.applied,
              appliedAt: new Date(),
              errorMessage: null
            }
          });

          return {
            clientMutationId: mutation.clientMutationId,
            status: SyncStatus.applied,
            resourceId
          };
        } catch (error) {
          await transaction.syncMutation.update({
            where: { id: syncMutation.id },
            data: {
              status: SyncStatus.failed,
              errorMessage: error instanceof Error ? error.message : "Unknown sync error"
            }
          });

          return {
            clientMutationId: mutation.clientMutationId,
            status: SyncStatus.failed,
            errorMessage: error instanceof Error ? error.message : "Unknown sync error"
          };
        }
      });

      results.push(result);
    }

    return results;
  }

  private async applyMutation(db: SyncDbClient, userId: string, mutation: SyncMutationInput) {
    switch (mutation.entityType) {
      case "meal_log": {
        if (mutation.operation !== "create") {
          throw new ApiError(400, "Only create is supported for meal_log sync");
        }

        const payload = createMealSchema.parse(mutation.payload) as CreateMealInput;
        const meal = await mealsService.createMeal(userId, payload, db);
        return meal.id;
      }
      case "progress_entry": {
        if (mutation.operation !== "create") {
          throw new ApiError(400, "Only create is supported for progress_entry sync");
        }

        const payload = createProgressSchema.parse(mutation.payload) as CreateProgressInput;
        const entry = await progressService.create(userId, payload, db);
        return entry.id;
      }
      case "workout": {
        if (mutation.operation !== "create") {
          throw new ApiError(400, "Only create is supported for workout sync");
        }

        const payload = createWorkoutSchema.parse(mutation.payload) as CreateWorkoutInput;
        const workout = await workoutsService.create(userId, payload, db);
        return workout.id;
      }
      default:
        throw new ApiError(400, `Unsupported sync entity type: ${mutation.entityType}`);
    }
  }
}

export const syncService = new SyncService();
