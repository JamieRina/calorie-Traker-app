import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { profileController } from "./profile.controller";
import { goalSchema, upsertProfileSchema } from "./profile.validators";

export const profileRouter = Router();

profileRouter.use(requireAuth);
profileRouter.get("/me", asyncHandler(profileController.getMe.bind(profileController)));
profileRouter.patch("/me", validateBody(upsertProfileSchema), asyncHandler(profileController.updateMe.bind(profileController)));
profileRouter.post("/goal", validateBody(goalSchema), asyncHandler(profileController.saveGoal.bind(profileController)));
