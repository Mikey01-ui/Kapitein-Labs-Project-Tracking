import type { Request, Response } from "express";
import { prisma } from "../services/prisma.js";
import { logActivity } from "../services/activityService.js";
import { createNotification } from "../services/notificationService.js";
import { analyzeAttachment } from "../services/imageAnalyzer.js";
import fs from "fs";
import path from "path";

// List expenses
export async function listExpenses(request: Request, response: Response) {
  const userId = request.user?.userId;
  const role = request.user?.role;

  if (!userId) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { projectId, employeeId, status } = request.query;

  try {
    const whereClause: any = {};

    // Employees can only see their own expenses
    if (role === "EMPLOYEE") {
      whereClause.userId = userId;
    } else {
      // Admins/Managers can filter by employee
      if (employeeId) {
        whereClause.userId = String(employeeId);
      }
    }

    if (projectId) {
      whereClause.projectId = String(projectId);
    }

    if (status) {
      whereClause.status = String(status);
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            name: true
          }
        },
        attachments: true
      },
      orderBy: { date: "desc" }
    });

    response.status(200).json({ expenses });
  } catch (error) {
    console.error("Failed to list expenses:", error);
    response.status(500).json({ message: "Failed to fetch expenses." });
  }
}

// Create Expense
export async function createExpense(request: Request, response: Response) {
  const userId = request.user?.userId;

  if (!userId) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { projectId, amount, currency, merchant, date, category, notes, attachmentUrl } = request.body;

  if (!amount || !merchant || !date || !category) {
    response.status(400).json({ message: "Amount, merchant, date, and category are required." });
    return;
  }

  try {
    const expense = await prisma.expense.create({
      data: {
        userId,
        projectId: projectId || null,
        amount: Number(amount),
        currency: currency || "EUR",
        merchant,
        date: new Date(date),
        category,
        notes: notes || null,
        status: "PENDING"
      }
    });

    // Link uploaded receipt attachment if URL is specified
    if (attachmentUrl) {
      let attachment = await prisma.attachment.findFirst({
        where: { url: attachmentUrl, uploadedById: userId }
      });

      if (!attachment) {
        // Create a new attachment record since it wasn't created during upload
        const filename = attachmentUrl.split("/").pop() || "receipt.png";
        const ext = filename.split(".").pop()?.toLowerCase();
        const mimeType = ext === "pdf" ? "application/pdf" : `image/${ext || "png"}`;
        
        let size = 0;
        try {
          const filePath = path.join(process.cwd(), "uploads", filename);
          if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            size = stats.size;
          }
        } catch (e) {
          console.error("Failed to get physical file size:", e);
        }

        attachment = await prisma.attachment.create({
          data: {
            name: filename,
            url: attachmentUrl,
            size,
            mimeType,
            uploadedById: userId,
            projectId: projectId || null,
            expenseId: expense.id,
            ocrStatus: "PENDING"
          }
        });
      } else {
        attachment = await prisma.attachment.update({
          where: { id: attachment.id },
          data: {
            expenseId: expense.id,
            projectId: projectId || null
          }
        });
      }
      
      // Trigger background AI receipt analysis
      if (attachment) {
        analyzeAttachment(attachment.id);
      }
    }

    logActivity(
      userId,
      "CREATED_EXPENSE",
      projectId || null,
      null,
      `Logged expense of ${amount} ${currency || "EUR"} at "${merchant}"`
    );

    response.status(201).json({
      message: "Expense logged successfully.",
      expense
    });
  } catch (error) {
    console.error("Failed to create expense:", error);
    response.status(500).json({ message: "Failed to log expense." });
  }
}

// Update Expense
export async function updateExpense(request: Request, response: Response) {
  const { id } = request.params;
  const userId = request.user?.userId;
  const role = request.user?.role;

  if (!userId) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { projectId, amount, currency, merchant, date, category, notes } = request.body;

  try {
    const exists = await prisma.expense.findUnique({
      where: { id }
    });

    if (!exists) {
      response.status(404).json({ message: "Expense not found." });
      return;
    }

    // Permission Check: Employee can only edit their own pending expenses
    if (role === "EMPLOYEE" && exists.userId !== userId) {
      response.status(403).json({ message: "Forbidden" });
      return;
    }

    if (role === "EMPLOYEE" && exists.status !== "PENDING") {
      response.status(400).json({ message: "Cannot edit an approved or rejected expense." });
      return;
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        projectId: projectId !== undefined ? (projectId || null) : undefined,
        amount: amount !== undefined ? Number(amount) : undefined,
        currency: currency !== undefined ? currency : undefined,
        merchant: merchant !== undefined ? merchant : undefined,
        date: date !== undefined ? new Date(date) : undefined,
        category: category !== undefined ? category : undefined,
        notes: notes !== undefined ? (notes || null) : undefined
      }
    });

    logActivity(
      userId,
      "UPDATED_EXPENSE",
      updated.projectId,
      null,
      `Updated expense details for "${updated.merchant}"`
    );

    response.status(200).json({
      message: "Expense updated successfully.",
      expense: updated
    });
  } catch (error) {
    console.error("Failed to update expense:", error);
    response.status(500).json({ message: "Failed to update expense." });
  }
}

// Delete Expense
export async function deleteExpense(request: Request, response: Response) {
  const { id } = request.params;
  const userId = request.user?.userId;
  const role = request.user?.role;

  if (!userId) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const exists = await prisma.expense.findUnique({
      where: { id }
    });

    if (!exists) {
      response.status(404).json({ message: "Expense not found." });
      return;
    }

    // Permission Check: Employee can only delete their own pending expenses
    if (role === "EMPLOYEE" && exists.userId !== userId) {
      response.status(403).json({ message: "Forbidden" });
      return;
    }

    if (role === "EMPLOYEE" && exists.status !== "PENDING") {
      response.status(400).json({ message: "Cannot delete an approved or rejected expense." });
      return;
    }

    await prisma.expense.delete({
      where: { id }
    });

    logActivity(
      userId,
      "DELETED_EXPENSE",
      exists.projectId,
      null,
      `Deleted expense for "${exists.merchant}"`
    );

    response.status(200).json({ message: "Expense deleted successfully." });
  } catch (error) {
    console.error("Failed to delete expense:", error);
    response.status(500).json({ message: "Failed to delete expense." });
  }
}

// Approve / Reject Expense
export async function approveExpense(request: Request, response: Response) {
  const { id } = request.params;
  const userId = request.user?.userId;
  const role = request.user?.role;

  if (!userId) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (role !== "ADMIN" && role !== "MANAGER") {
    response.status(403).json({ message: "Only admins and managers can review expenses." });
    return;
  }

  const { approved, feedback } = request.body;

  if (approved === undefined) {
    response.status(400).json({ message: "Approved status (true/false) is required." });
    return;
  }

  try {
    const exists = await prisma.expense.findUnique({
      where: { id }
    });

    if (!exists) {
      response.status(404).json({ message: "Expense not found." });
      return;
    }

    const newStatus = approved ? "APPROVED" : "REJECTED";

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        status: newStatus,
        approvedById: userId,
        notes: feedback ? `${exists.notes || ""}\n\n[Review Feedback]: ${feedback}`.trim() : exists.notes
      }
    });

    // Log action activity
    logActivity(
      userId,
      approved ? "APPROVED_EXPENSE" : "REJECTED_EXPENSE",
      exists.projectId,
      null,
      `${approved ? "Approved" : "Rejected"} expense of ${exists.amount} ${exists.currency} for "${exists.merchant}"`
    );

    // Notify employee of the decision
    await createNotification({
      recipientId: exists.userId,
      title: `Expense Log ${approved ? "Approved" : "Rejected"}`,
      message: `Your logged expense of ${exists.amount} ${exists.currency} for "${exists.merchant}" has been ${approved ? "approved" : "rejected"}.${feedback ? ` Feedback: "${feedback}"` : ""}`,
      type: "EXPENSE_APPROVAL",
      link: "/expenses"
    });

    response.status(200).json({
      message: `Expense successfully ${approved ? "approved" : "rejected"}.`,
      expense: updated
    });
  } catch (error) {
    console.error("Failed to approve expense:", error);
    response.status(500).json({ message: "Failed to process expense review." });
  }
}
