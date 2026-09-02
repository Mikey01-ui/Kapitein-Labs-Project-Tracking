import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getAgencyAnalytics, getProjectStatus } from "../controllers/reports.controller.js";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

reportsRouter.get("/analytics", getAgencyAnalytics);
reportsRouter.get("/project-status", getProjectStatus);
