import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { recipesController } from "./recipes.controller";
import { createRecipeSchema, parseRecipeSchema } from "./recipes.validators";

export const recipesRouter = Router();

recipesRouter.use(requireAuth);
recipesRouter.get("/", asyncHandler(recipesController.list.bind(recipesController)));
recipesRouter.post("/parse", validateBody(parseRecipeSchema), asyncHandler(recipesController.parse.bind(recipesController)));
recipesRouter.post("/", validateBody(createRecipeSchema), asyncHandler(recipesController.create.bind(recipesController)));
