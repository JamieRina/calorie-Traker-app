import { z } from "zod";

export const syncMutationsSchema = z.object({
  mutations: z.array(
    z.object({
      clientMutationId: z.string().trim().min(6).max(120),
      entityType: z.enum(["meal_log", "progress_entry", "workout"]),
      operation: z.enum(["create", "update", "delete"]),
      payload: z.record(z.any())
    })
  ).min(1).max(50)
});
