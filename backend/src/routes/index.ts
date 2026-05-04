import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes";
import { profileRouter } from "../modules/profile/profile.routes";
import { foodsRouter } from "../modules/foods/foods.routes";
import { mealsRouter } from "../modules/meals/meals.routes";
import { recipesRouter } from "../modules/recipes/recipes.routes";
import { analyticsRouter } from "../modules/analytics/analytics.routes";
import { remindersRouter } from "../modules/reminders/reminders.routes";
import { communityRouter } from "../modules/community/community.routes";
import { syncRouter } from "../modules/sync/sync.routes";
import { progressRouter } from "../modules/progress/progress.routes";
import { goalsRouter } from "../modules/goals/goals.routes";
import { workoutsRouter } from "../modules/workouts/workouts.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/profile", profileRouter);
apiRouter.use("/goals", goalsRouter);
apiRouter.use("/foods", foodsRouter);
apiRouter.use("/meals", mealsRouter);
apiRouter.use("/recipes", recipesRouter);
apiRouter.use("/analytics", analyticsRouter);
apiRouter.use("/reminders", remindersRouter);
apiRouter.use("/community", communityRouter);
apiRouter.use("/sync", syncRouter);
apiRouter.use("/progress", progressRouter);
apiRouter.use("/workouts", workoutsRouter);
