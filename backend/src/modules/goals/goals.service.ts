import { prisma } from "../../config/prisma";
import { ApiError } from "../../lib/api-error";
import { localBackend } from "../../lib/local-backend";
import { withLocalFallback } from "../../lib/local-fallback";
import { type GoalType } from "../../lib/domain-enums";
import { type GoalRecord } from "../../lib/service-contracts";
import { calculateAndSaveGoalForUser } from "../profile/profile.service";

export class GoalsService {
  async getCurrentGoal(userId: string) {
    return withLocalFallback<GoalRecord>(
      "goals.getCurrentGoal",
      async () => {
        const goal = await prisma.goal.findUnique({
          where: { userId }
        });

        if (!goal) {
          throw new ApiError(404, "Goal not found");
        }

        return goal;
      },
      async () => localBackend.getCurrentGoal(userId)
    );
  }

  async calculateAndSaveGoal(userId: string, goalType: GoalType) {
    return calculateAndSaveGoalForUser(userId, goalType);
  }
}

export const goalsService = new GoalsService();
