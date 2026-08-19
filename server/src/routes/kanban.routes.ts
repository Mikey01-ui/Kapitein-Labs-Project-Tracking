import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { updateColumn, deleteColumn, updateCard, deleteCard } from "../controllers/kanban.controller.js";

export const kanbanRouter = Router();
kanbanRouter.use(requireAuth);


kanbanRouter.put("/columns/:id", updateColumn);
kanbanRouter.delete("/columns/:id", deleteColumn);
kanbanRouter.put("/cards/:id", updateCard);
kanbanRouter.delete("/cards/:id", deleteCard);

