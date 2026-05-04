import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { communityController } from "./community.controller";

export const communityRouter = Router();

communityRouter.get("/feed", asyncHandler(communityController.feed.bind(communityController)));
