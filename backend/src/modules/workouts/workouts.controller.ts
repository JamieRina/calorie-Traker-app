import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { workoutsService } from "./workouts.service";

export class WorkoutsController {
  async create(request: AuthenticatedRequest, response: Response) {
    const result = await workoutsService.create(request.user!.sub, request.body);
    response.status(201).json(result);
  }

  async list(request: AuthenticatedRequest, response: Response) {
    const result = await workoutsService.list(request.user!.sub);
    response.json(result);
  }
}

export const workoutsController = new WorkoutsController();
