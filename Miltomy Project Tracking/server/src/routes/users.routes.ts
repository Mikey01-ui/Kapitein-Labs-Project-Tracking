import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { listUsers, updateUser, deleteUser, changePassword } from "../controllers/users.controller.js";

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get("/", listUsers);
usersRouter.put("/:id", updateUser);
usersRouter.delete("/:id", requireRole("OWNER"), deleteUser);
usersRouter.post("/:id/change-password", changePassword);
