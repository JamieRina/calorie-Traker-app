import { z } from "zod";
import { prisma } from "../../config/prisma";
import { recipeParserService } from "./recipe-parser.service";
import { createRecipeSchema } from "./recipes.validators";

type CreateRecipeInput = z.infer<typeof createRecipeSchema>;

export class RecipesService {
  async parseRecipe(title: string, sourceText: string, servings: number) {
    return recipeParserService.parse(title, sourceText, servings);
  }

  async createRecipe(userId: string, input: CreateRecipeInput) {
    const nutritionFact = await prisma.nutritionFact.create({
      data: input.nutrition
    });

    return prisma.recipe.create({
      data: {
        userId,
        title: input.title,
        description: input.description,
        servings: input.servings,
        sourceText: input.sourceText,
        aiConfidence: input.aiConfidence,
        nutritionFactId: nutritionFact.id,
        ingredients: {
          create: input.ingredients
        }
      },
      include: {
        ingredients: true,
        nutritionFact: true
      }
    });
  }
}

export const recipesService = new RecipesService();
