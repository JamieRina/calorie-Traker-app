import bcrypt from "bcryptjs";
import slugify from "slugify";
import { PrismaClient } from "@prisma/client";
import { ActivityLevel, ContentType, GoalType, MealType } from "../src/lib/domain-enums";

const prisma = new PrismaClient();

async function makeNutrition(calories: number, protein: number, carbs: number, fat: number, fibre = 0) {
  return prisma.nutritionFact.create({
    data: {
      calories,
      proteinGrams: protein,
      carbsGrams: carbs,
      fatGrams: fat,
      fibreGrams: fibre
    }
  });
}

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const chickenNutrition = await makeNutrition(165, 31, 0, 3.6, 0);
  const oatsNutrition = await makeNutrition(389, 16.9, 66.3, 6.9, 10.6);
  const bananaNutrition = await makeNutrition(89, 1.1, 22.8, 0.3, 2.6);
  const recipeNutrition = await makeNutrition(520, 38, 42, 18, 9);
  const greekYoghurtNutrition = await makeNutrition(97, 10, 3.6, 5, 0);
  const riceNutrition = await makeNutrition(130, 2.7, 28, 0.3, 0.4);
  const salmonNutrition = await makeNutrition(208, 20, 0, 13, 0);
  const eggNutrition = await makeNutrition(155, 13, 1.1, 11, 0);
  const appleNutrition = await makeNutrition(52, 0.3, 14, 0.2, 2.4);
  const cottageCheeseNutrition = await makeNutrition(98, 11.1, 3.4, 4.3, 0);
  const breadNutrition = await makeNutrition(247, 13, 41, 4.2, 7);

  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      passwordHash,
      displayName: "Demo User",
      profile: {
        create: {
          sex: "male",
          activityLevel: ActivityLevel.moderate,
          heightCm: 178,
          currentWeightKg: 82,
          targetWeightKg: 76,
          onboardingDone: true
        }
      },
      goal: {
        create: {
          goalType: GoalType.lose,
          dailyCalories: 2200,
          proteinGrams: 165,
          carbsGrams: 220,
          fatsGrams: 70,
          fibreGrams: 30,
          weeklyWeightDelta: -0.4
        }
      },
      preferences: {
        createMany: {
          data: [
            { type: "diet", value: "high_protein" },
            { type: "avoid", value: "peanuts" }
          ]
        }
      }
    }
  });

  const foods = [
    { name: "Chicken breast, grilled", nutritionFactId: chickenNutrition.id, category: "protein" },
    { name: "Rolled oats", nutritionFactId: oatsNutrition.id, category: "carbs" },
    { name: "Banana", nutritionFactId: bananaNutrition.id, category: "fruit" },
    { name: "Greek yoghurt", nutritionFactId: greekYoghurtNutrition.id, category: "dairy" },
    { name: "Cooked white rice", nutritionFactId: riceNutrition.id, category: "carbs" },
    { name: "Salmon fillet", nutritionFactId: salmonNutrition.id, category: "protein" },
    { name: "Egg", nutritionFactId: eggNutrition.id, category: "protein" },
    { name: "Apple", nutritionFactId: appleNutrition.id, category: "fruit" },
    { name: "Cottage cheese", nutritionFactId: cottageCheeseNutrition.id, category: "dairy" },
    { name: "Wholemeal bread", nutritionFactId: breadNutrition.id, category: "bakery" }
  ];

  for (const food of foods) {
    await prisma.food.upsert({
      where: { slug: slugify(food.name, { lower: true, strict: true }) },
      update: {},
      create: {
        ...food,
        slug: slugify(food.name, { lower: true, strict: true })
      }
    });
  }

  const bananaFood = await prisma.food.findUniqueOrThrow({
    where: { slug: "banana" }
  });

  await prisma.brandedFood.upsert({
    where: { barcode: "5000159484695" },
    update: {},
    create: {
      barcode: "5000159484695",
      brandName: "DemoBrand",
      productName: "Protein Yoghurt Pot",
      nutritionFact: {
        create: {
          calories: 95,
          proteinGrams: 15,
          carbsGrams: 6,
          fatGrams: 0.2,
          fibreGrams: 0
        }
      },
      source: "seed"
    }
  });

  const recipe = await prisma.recipe.create({
    data: {
      userId: user.id,
      title: "Overnight oats bowl",
      description: "Quick breakfast recipe",
      servings: 1,
      aiConfidence: 0.92,
      nutritionFactId: recipeNutrition.id,
      ingredients: {
        create: [
          {
            rawText: "60g oats",
            ingredientName: "Rolled oats",
            amount: 60,
            unit: "g",
            gramsEstimate: 60,
            caloriesEstimate: 233,
            confidence: 0.99
          },
          {
            rawText: "1 banana",
            ingredientName: "Banana",
            amount: 1,
            unit: "item",
            gramsEstimate: 118,
            caloriesEstimate: 105,
            confidence: 0.97
          }
        ]
      }
    }
  });

  await prisma.favourite.create({
    data: {
      userId: user.id,
      foodId: bananaFood.id
    }
  });

  await prisma.mealLog.create({
    data: {
      userId: user.id,
      consumedAt: new Date(),
      mealType: MealType.breakfast,
      totalCalories: 520,
      totalProtein: 38,
      totalCarbs: 42,
      totalFat: 18,
      totalFibre: 9,
      items: {
        create: [
          {
            recipeId: recipe.id,
            nutritionFactId: recipeNutrition.id,
            displayName: recipe.title,
            portionCount: 1
          }
        ]
      }
    }
  });

  await prisma.influencerContent.createMany({
    data: [
      {
        slug: "7-day-high-protein-reset",
        title: "7-day high-protein reset",
        summary: "A beginner-friendly challenge designed with an influencer coach.",
        contentType: ContentType.challenge,
        authorName: "Coach Nova",
        body: "Daily prompts, recipes, and workouts.",
        publishedAt: new Date()
      },
      {
        slug: "quick-gym-boost-workout",
        title: "Quick gym boost workout",
        summary: "A 25-minute workout for busy professionals.",
        contentType: ContentType.workout,
        authorName: "Coach Nova",
        body: "Warm-up, supersets, cool-down.",
        publishedAt: new Date()
      }
    ],
    skipDuplicates: true
  });

  console.log("Seed complete. Demo login: demo@example.com / Password123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
