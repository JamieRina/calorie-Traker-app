import { z } from "zod";

export const syncMutationsSchema = z.object({
  mutations: z.array(
    z.object({
      clientMutationId: z.string().min(6),
      entityType: z.string().min(2),
      operation: z.enum(["create", "update", "delete"]),
      payload: z.record(z.any())
    })
  ).min(1)
});
