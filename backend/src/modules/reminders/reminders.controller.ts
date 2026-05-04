import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { remindersService } from "./reminders.service";

export class RemindersController {
  async create(request: AuthenticatedRequest, response: Response) {
    const result = await remindersService.create(request.user!.sub, request.body);
    response.status(201).json(result);
  }

  async list(request: AuthenticatedRequest, response: Response) {
    const result = await remindersService.list(request.user!.sub);
    response.json(result);
  }
}

export const remindersController = new RemindersController();
