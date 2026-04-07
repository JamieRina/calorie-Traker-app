import { OpenAI } from "openai";
import { env } from "../../config/env";

type ParsedIngredient = {
  rawText: string;
  ingredientName: string;
  amount?: number;
  unit?: string;
  gramsEstimate?: number;
  caloriesEstimate?: number;
  confidence?: number;
};

type ParseResult = {
  title: string;
  servings: number;
  ingredients: ParsedIngredient[];
  nutrition: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    fibreGrams: number;
  };
  aiConfidence: number;
  notes: string[];
};

const heuristics: Record<string, { grams: number; calories: number; protein: number; carbs: number; fat: number; fibre: number }> = {
  chicken: { grams: 100, calories: 165, protein: 31, carbs: 0, fat: 3.6, fibre: 0 },
  rice: { grams: 100, calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fibre: 0.4 },
  oats: { grams: 100, calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9, fibre: 10.6 },
  banana: { grams: 118, calories: 105, protein: 1.3, carbs: 27, fat: 0.3, fibre: 3.1 },
  egg: { grams: 50, calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8, fibre: 0 }
};

function heuristicParse(title: string, sourceText: string, servings: number): ParseResult {
  const lines = sourceText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const ingredients: ParsedIngredient[] = [];
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let fibre = 0;

  for (const rawText of lines) {
    const lower = rawText.toLowerCase();
    const match = Object.keys(heuristics).find((key) => lower.includes(key));
    const numberMatch = rawText.match(/(\d+(\.\d+)?)/);
    const amount = numberMatch ? Number(numberMatch[1]) : 1;
    const unit = rawText.includes("g") ? "g" : rawText.includes("tbsp") ? "tbsp" : "item";

    if (match) {
      const reference = heuristics[match];
      const multiplier = unit === "g" ? amount / reference.grams : amount;
      calories += reference.calories * multiplier;
      protein += reference.protein * multiplier;
      carbs += reference.carbs * multiplier;
      fat += reference.fat * multiplier;
      fibre += reference.fibre * multiplier;

      ingredients.push({
        rawText,
        ingredientName: match,
        amount,
        unit,
        gramsEstimate: unit === "g" ? amount : reference.grams * amount,
        caloriesEstimate: reference.calories * multiplier,
        confidence: 0.74
      });
    } else {
      ingredients.push({
        rawText,
        ingredientName: rawText.replace(/^\d+(\.\d+)?\s*/, ""),
        amount,
        unit,
        confidence: 0.42
      });
    }
  }

  return {
    title,
    servings,
    ingredients,
    nutrition: {
      calories: Math.round(calories),
      proteinGrams: Math.round(protein),
      carbsGrams: Math.round(carbs),
      fatGrams: Math.round(fat),
      fibreGrams: Math.round(fibre)
    },
    aiConfidence: ingredients.every((item) => (item.confidence ?? 0) > 0.6) ? 0.82 : 0.56,
    notes: ["Fallback heuristic parser was used because no model key is configured."]
  };
}

export class RecipeParserService {
  private openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

  async parse(title: string, sourceText: string, servings: number) {
    if (!this.openai) {
      return heuristicParse(title, sourceText, servings);
    }

    const prompt = `
Parse the following recipe ingredients into structured JSON.
Normalise units, estimate grams where possible, and estimate total nutrition.
Return JSON only with keys:
title, servings, ingredients, nutrition, aiConfidence, notes.

Recipe title: ${title}
Servings: ${servings}
Source text:
${sourceText}
`;

    const response = await this.openai.responses.create({
      model: env.OPENAI_MODEL,
      input: prompt
    });

    const text = response.output_text;
    try {
      return JSON.parse(text);
    } catch {
      return heuristicParse(title, sourceText, servings);
    }
  }
}

export const recipeParserService = new RecipeParserService();
