import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { syncController } from "./sync.controller";
import { syncMutationsSchema } from "./sync.validators";

export const syncRouter = Router();

syncRouter.use(requireAuth);
syncRouter.post("/mutations", validateBody(syncMutationsSchema), asyncHandler(syncController.apply.bind(syncController)));
