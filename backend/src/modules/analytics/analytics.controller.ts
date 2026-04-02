import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { analyticsService } from "./analytics.service";

export class AnalyticsController {
  async dashboard(request: AuthenticatedRequest, response: Response) {
    const date = String(request.query.date);
    const result = await analyticsService.getDashboard(request.user!.sub, date);
    response.json(result);
  }
}

export const analyticsController = new AnalyticsController();
