import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { goalsController } from "./goals.controller";
import { calculateGoalSchema } from "./goals.validators";

export const goalsRouter = Router();

goalsRouter.use(requireAuth);
goalsRouter.get("/current", asyncHandler(goalsController.current.bind(goalsController)));
goalsRouter.post(
  "/calculate",
  validateBody(calculateGoalSchema),
  asyncHandler(goalsController.calculate.bind(goalsController))
);
