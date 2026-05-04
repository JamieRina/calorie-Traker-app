import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { progressService } from "./progress.service";

export class ProgressController {
  async create(request: AuthenticatedRequest, response: Response) {
    const result = await progressService.create(request.user!.sub, request.body);
    response.status(201).json(result);
  }

  async list(request: AuthenticatedRequest, response: Response) {
    const result = await progressService.list(request.user!.sub);
    response.json(result);
  }
}

export const progressController = new ProgressController();
