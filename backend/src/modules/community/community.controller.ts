import { Request, Response } from "express";
import { communityService } from "./community.service";

export class CommunityController {
  async feed(_request: Request, response: Response) {
    const result = await communityService.getFeed();
    response.json(result);
  }
}

export const communityController = new CommunityController();
