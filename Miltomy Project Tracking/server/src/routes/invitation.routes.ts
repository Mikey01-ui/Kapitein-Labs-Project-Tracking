import { Router } from "express";
import {
  createInvitation,
  getInvitationByToken,
  acceptInvitation,
  listInvitations,
  cancelInvitation,
} from "../controllers/invitation.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";

export const invitationRouter = Router();

// Public routes for accepting invitations
invitationRouter.get("/token/:token", getInvitationByToken);
invitationRouter.post("/accept", acceptInvitation);

// Authenticated routes for managing invitations
invitationRouter.use(requireAuth);
invitationRouter.get("/", requireRole(["OWNER", "PROJECT_MANAGER"]), listInvitations);
invitationRouter.post("/", requireRole(["OWNER", "PROJECT_MANAGER"]), createInvitation);
invitationRouter.delete("/:id", requireRole(["OWNER", "PROJECT_MANAGER"]), cancelInvitation);
