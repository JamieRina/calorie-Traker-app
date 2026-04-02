import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { profileService } from "./profile.service";

export class ProfileController {
  async getMe(request: AuthenticatedRequest, response: Response) {
    const result = await profileService.getMe(request.user!.sub);
    response.json(result);
  }

  async updateMe(request: AuthenticatedRequest, response: Response) {
    const result = await profileService.upsertMe(request.user!.sub, request.body);
    response.json(result);
  }

  async saveGoal(request: AuthenticatedRequest, response: Response) {
    const result = await profileService.calculateAndSaveGoal(
      request.user!.sub,
      request.body.goalType
    );
    response.json(result);
  }
}

export const profileController = new ProfileController();
