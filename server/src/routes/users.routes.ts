import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { listUsers, updateUser, deleteUser, changePassword } from "../controllers/users.controller.js";

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get("/", listUsers);
usersRouter.put("/:id", updateUser);
usersRouter.delete("/:id", deleteUser);
usersRouter.post("/:id/change-password", changePassword);
