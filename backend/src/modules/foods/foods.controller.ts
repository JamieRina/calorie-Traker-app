import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { foodsService } from "./foods.service";

export class FoodsController {
  async search(request: Request, response: Response) {
    const q = String(request.query.q);
    const limit = Number(request.query.limit ?? 10);
    const result = await foodsService.searchFoods(q, limit);
    response.json(result);
  }

  async barcodeLookup(request: Request, response: Response) {
    const result = await foodsService.barcodeLookup(String(request.params.barcode));
    response.json(result);
  }

  async addFavourite(request: AuthenticatedRequest, response: Response) {
    const result = await foodsService.addFavourite(request.user!.sub, request.body.foodId, request.body.recipeId);
    response.status(201).json(result);
  }

  async removeFavourite(request: AuthenticatedRequest, response: Response) {
    const result = await foodsService.removeFavourite(request.user!.sub, request.body.foodId, request.body.recipeId);
    response.json(result);
  }

  async importFood(request: AuthenticatedRequest, response: Response) {
    const result = await foodsService.importFood(request.body);
    response.status(201).json(result);
  }

  async listFavourites(request: AuthenticatedRequest, response: Response) {
    const result = await foodsService.listFavourites(request.user!.sub);
    response.json(result);
  }

  async recent(request: AuthenticatedRequest, response: Response) {
    const result = await foodsService.listRecentFoods(request.user!.sub);
    response.json(result);
  }
}

export const foodsController = new FoodsController();
