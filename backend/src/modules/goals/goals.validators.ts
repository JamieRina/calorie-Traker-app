import { z } from "zod";
import { GoalType } from "../../lib/domain-enums";

export const calculateGoalSchema = z.object({
  goalType: z.nativeEnum(GoalType)
});
