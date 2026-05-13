import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate";
import { mealsController } from "./meals.controller";
import { createMealSchema, dailyMealsQuerySchema, mealIdParamSchema, updateMealSchema } from "./meals.validators";

export const mealsRouter = Router();

mealsRouter.use(requireAuth);
mealsRouter.post("/", validateBody(createMealSchema), asyncHandler(mealsController.create.bind(mealsController)));
mealsRouter.get("/daily", validateQuery(dailyMealsQuerySchema), asyncHandler(mealsController.daily.bind(mealsController)));
mealsRouter.patch(
  "/:mealId",
  validateParams(mealIdParamSchema),
  validateBody(updateMealSchema),
  asyncHandler(mealsController.update.bind(mealsController))
);
mealsRouter.delete("/:mealId", validateParams(mealIdParamSchema), asyncHandler(mealsController.remove.bind(mealsController)));
