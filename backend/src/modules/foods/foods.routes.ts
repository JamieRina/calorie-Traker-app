import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateQuery } from "../../middleware/validate";
import { foodsController } from "./foods.controller";
import { favouriteMutationSchema, importFoodSchema, searchFoodsQuerySchema } from "./foods.validators";

export const foodsRouter = Router();

foodsRouter.get("/search", validateQuery(searchFoodsQuerySchema), asyncHandler(foodsController.search.bind(foodsController)));
foodsRouter.get("/barcode/:barcode", asyncHandler(foodsController.barcodeLookup.bind(foodsController)));

foodsRouter.use(requireAuth);
foodsRouter.post("/import", validateBody(importFoodSchema), asyncHandler(foodsController.importFood.bind(foodsController)));
foodsRouter.post("/favourites", validateBody(favouriteMutationSchema), asyncHandler(foodsController.addFavourite.bind(foodsController)));
foodsRouter.delete("/favourites", validateBody(favouriteMutationSchema), asyncHandler(foodsController.removeFavourite.bind(foodsController)));
foodsRouter.get("/favourites", asyncHandler(foodsController.listFavourites.bind(foodsController)));
foodsRouter.get("/recent", asyncHandler(foodsController.recent.bind(foodsController)));
