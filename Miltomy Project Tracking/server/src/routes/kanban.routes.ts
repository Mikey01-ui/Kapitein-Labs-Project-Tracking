import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { 
  updateColumn, 
  deleteColumn, 
  updateCard, 
  deleteCard,
  addCardComment,
  deleteCardComment,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem
} from "../controllers/kanban.controller.js";

export const kanbanRouter = Router();
kanbanRouter.use(requireAuth);

kanbanRouter.put("/columns/:id", updateColumn);
kanbanRouter.delete("/columns/:id", deleteColumn);
kanbanRouter.put("/cards/:id", updateCard);
kanbanRouter.delete("/cards/:id", deleteCard);

// Comments
kanbanRouter.post("/cards/:id/comments", addCardComment);
kanbanRouter.delete("/cards/:cardId/comments/:commentId", deleteCardComment);

// Checklists
kanbanRouter.post("/cards/:id/checklist", addChecklistItem);
kanbanRouter.put("/cards/:cardId/checklist/:itemId", updateChecklistItem);
kanbanRouter.delete("/cards/:cardId/checklist/:itemId", deleteChecklistItem);
