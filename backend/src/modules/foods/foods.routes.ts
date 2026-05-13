import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate";
import { foodsController } from "./foods.controller";
import {
  barcodeParamSchema,
  favouriteMutationSchema,
  importFoodSchema,
  searchFoodsQuerySchema,
  usdaFoodParamSchema
} from "./foods.validators";

export const foodsRouter = Router();

foodsRouter.get("/search", validateQuery(searchFoodsQuerySchema), asyncHandler(foodsController.search.bind(foodsController)));
foodsRouter.get("/barcode/:barcode", validateParams(barcodeParamSchema), asyncHandler(foodsController.barcodeLookup.bind(foodsController)));
foodsRouter.get("/usda/:fdcId", validateParams(usdaFoodParamSchema), asyncHandler(foodsController.usdaFoodDetail.bind(foodsController)));

foodsRouter.use(requireAuth);
foodsRouter.post("/import", validateBody(importFoodSchema), asyncHandler(foodsController.importFood.bind(foodsController)));
foodsRouter.post("/favourites", validateBody(favouriteMutationSchema), asyncHandler(foodsController.addFavourite.bind(foodsController)));
foodsRouter.delete("/favourites", validateBody(favouriteMutationSchema), asyncHandler(foodsController.removeFavourite.bind(foodsController)));
foodsRouter.get("/favourites", asyncHandler(foodsController.listFavourites.bind(foodsController)));
foodsRouter.get("/recent", asyncHandler(foodsController.recent.bind(foodsController)));
