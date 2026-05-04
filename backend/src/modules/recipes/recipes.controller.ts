import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { recipesService } from "./recipes.service";

export class RecipesController {
  async parse(request: AuthenticatedRequest, response: Response) {
    const result = await recipesService.parseRecipe(
      request.body.title,
      request.body.sourceText,
      request.body.servings
    );
    response.json(result);
  }

  async create(request: AuthenticatedRequest, response: Response) {
    const result = await recipesService.createRecipe(request.user!.sub, request.body);
    response.status(201).json(result);
  }
}

export const recipesController = new RecipesController();
