import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { updateMilestone, deleteMilestone } from "../controllers/milestones.controller.js";

export const milestonesRouter = Router();
milestonesRouter.use(requireAuth);


milestonesRouter.put("/:id", updateMilestone);
milestonesRouter.delete("/:id", deleteMilestone);

