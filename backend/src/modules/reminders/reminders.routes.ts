import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { remindersController } from "./reminders.controller";
import { createReminderSchema } from "./reminders.validators";

export const remindersRouter = Router();

remindersRouter.use(requireAuth);
remindersRouter.post("/", validateBody(createReminderSchema), asyncHandler(remindersController.create.bind(remindersController)));
remindersRouter.get("/", asyncHandler(remindersController.list.bind(remindersController)));
