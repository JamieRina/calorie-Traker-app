import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { goalsService } from "./goals.service";

export class GoalsController {
  async current(request: AuthenticatedRequest, response: Response) {
    const result = await goalsService.getCurrentGoal(request.user!.sub);
    response.json(result);
  }

  async calculate(request: AuthenticatedRequest, response: Response) {
    const result = await goalsService.calculateAndSaveGoal(request.user!.sub, request.body.goalType);
    response.json(result);
  }
}

export const goalsController = new GoalsController();
