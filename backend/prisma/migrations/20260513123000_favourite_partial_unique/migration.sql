-- Prevent duplicate favourites when one side of the food/recipe pair is NULL.
CREATE UNIQUE INDEX IF NOT EXISTS "Favourite_userId_foodId_not_null_key"
  ON "Favourite"("userId", "foodId")
  WHERE "foodId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Favourite_userId_recipeId_not_null_key"
  ON "Favourite"("userId", "recipeId")
  WHERE "recipeId" IS NOT NULL;
