import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { progressController } from "./progress.controller";
import { createProgressSchema } from "./progress.validators";

export const progressRouter = Router();

progressRouter.use(requireAuth);
progressRouter.post("/", validateBody(createProgressSchema), asyncHandler(progressController.create.bind(progressController)));
progressRouter.get("/", asyncHandler(progressController.list.bind(progressController)));
