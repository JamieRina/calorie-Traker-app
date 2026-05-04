import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateQuery } from "../../middleware/validate";
import { mealsController } from "./meals.controller";
import { createMealSchema, dailyMealsQuerySchema } from "./meals.validators";

export const mealsRouter = Router();

mealsRouter.use(requireAuth);
mealsRouter.post("/", validateBody(createMealSchema), asyncHandler(mealsController.create.bind(mealsController)));
mealsRouter.get("/daily", validateQuery(dailyMealsQuerySchema), asyncHandler(mealsController.daily.bind(mealsController)));
mealsRouter.delete("/:mealId", asyncHandler(mealsController.remove.bind(mealsController)));
