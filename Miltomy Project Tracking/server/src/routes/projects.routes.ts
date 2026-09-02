import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  archiveProject,
  deleteProject,
  createProject,
  getProject,
  listProjects,
  updateProject,
  listMembers,
  assignMember,
  removeMember
} from "../controllers/projects.controller.js";
import { listMilestones, createMilestone } from "../controllers/milestones.controller.js";
import { getKanbanBoard, createColumn, createCard } from "../controllers/kanban.controller.js";

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

projectsRouter.get("/", listProjects);
projectsRouter.post("/", createProject);
projectsRouter.get("/:id", getProject);
projectsRouter.put("/:id", updateProject);
projectsRouter.delete("/:id", archiveProject);
projectsRouter.delete("/:id/force", requireRole("OWNER"), deleteProject);

projectsRouter.get("/:id/members", listMembers);
projectsRouter.post("/:id/members", assignMember);
projectsRouter.delete("/:id/members/:userId", removeMember);

projectsRouter.get("/:id/milestones", listMilestones);
projectsRouter.post("/:id/milestones", createMilestone);

projectsRouter.get("/:id/kanban", getKanbanBoard);
projectsRouter.post("/:id/kanban/columns", createColumn);
projectsRouter.post("/:id/kanban/cards", createCard);
