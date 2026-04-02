import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { workoutsController } from "./workouts.controller";
import { createWorkoutSchema } from "./workouts.validators";

export const workoutsRouter = Router();

workoutsRouter.use(requireAuth);
workoutsRouter.post("/", validateBody(createWorkoutSchema), asyncHandler(workoutsController.create.bind(workoutsController)));
workoutsRouter.get("/", asyncHandler(workoutsController.list.bind(workoutsController)));
