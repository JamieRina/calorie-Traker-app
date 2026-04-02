import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { validateQuery } from "../../middleware/validate";
import { analyticsController } from "./analytics.controller";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);
analyticsRouter.get(
  "/dashboard",
  validateQuery(z.object({ date: z.string().date() })),
  asyncHandler(analyticsController.dashboard.bind(analyticsController))
);
