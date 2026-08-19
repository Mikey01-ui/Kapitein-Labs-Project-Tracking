import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getHoursByPerson, getHoursByProject, getProjectStatus } from "../controllers/reports.controller.js";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);


reportsRouter.get("/hours-by-person", getHoursByPerson);
reportsRouter.get("/hours-by-project", getHoursByProject);
reportsRouter.get("/project-status", getProjectStatus);
reportsRouter.get("/export/pdf", (_request, response) => response.status(501).json({ message: "PDF export is planned for a later phase." }));
reportsRouter.get("/export/excel", (_request, response) => response.status(501).json({ message: "Excel export is planned for a later phase." }));

