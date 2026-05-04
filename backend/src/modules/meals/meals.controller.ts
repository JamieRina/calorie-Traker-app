import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { mealsService } from "./meals.service";

export class MealsController {
  async create(request: AuthenticatedRequest, response: Response) {
    const result = await mealsService.createMeal(request.user!.sub, request.body);
    response.status(201).json(result);
  }

  async daily(request: AuthenticatedRequest, response: Response) {
    const result = await mealsService.getDailyMeals(request.user!.sub, String(request.query.date));
    response.json(result);
  }

  async remove(request: AuthenticatedRequest, response: Response) {
    const result = await mealsService.removeMeal(request.user!.sub, String(request.params.mealId));
    response.json(result);
  }
}

export const mealsController = new MealsController();
