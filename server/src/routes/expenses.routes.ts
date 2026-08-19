import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  approveExpense
} from "../controllers/expenses.controller.js";

export const expensesRouter = Router();

expensesRouter.use(requireAuth);

expensesRouter.get("/", listExpenses);
expensesRouter.post("/", createExpense);
expensesRouter.put("/:id", updateExpense);
expensesRouter.delete("/:id", deleteExpense);
expensesRouter.post("/:id/approve", approveExpense);
