import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { syncService } from "./sync.service";

export class SyncController {
  async apply(request: AuthenticatedRequest, response: Response) {
    const result = await syncService.applyMutations(request.user!.sub, request.body.mutations);
    response.json({ mutations: result });
  }
}

export const syncController = new SyncController();
