import type { Request, Response } from "express";
import { prisma } from "../services/prisma.js";
import { createNotification } from "../services/notificationService.js";
import { logActivity } from "../services/activityService.js";

// Fetch Kanban Board (columns + cards) for a project
export async function getKanbanBoard(request: Request, response: Response) {
  const { id } = request.params; // project ID

  try {
    const project = await prisma.project.findUnique({
      where: { id }
    });

    if (!project) {
      response.status(404).json({ message: "Project not found." });
      return;
    }

    const columns = await prisma.kanbanColumn.findMany({
      where: { projectId: id },
      orderBy: { order: "asc" },
      include: {
        cards: {
          orderBy: { order: "asc" },
          include: { 
            assignees: { select: { id: true, name: true, email: true, avatarUrl: true } },
            attachments: true,
            checklistItems: { orderBy: { order: "asc" } },
            comments: {
              orderBy: { createdAt: "asc" },
              include: { user: { select: { id: true, name: true, avatarUrl: true } } }
            }
          }
        }
      }
    });

    response.status(200).json({ columns });
  } catch (error) {
    console.error("Failed to fetch Kanban board:", error);
    response.status(500).json({ message: "Failed to fetch Kanban board." });
  }
}

// Create Kanban Column
export async function createColumn(request: Request, response: Response) {
  const { id } = request.params; // project ID
  const { title, order } = request.body;

  if (!title) {
    response.status(400).json({ message: "Column title is required." });
    return;
  }

  try {
    const colOrder = order !== undefined ? Number(order) : 1;
    const column = await prisma.kanbanColumn.create({
      data: {
        projectId: id,
        title,
        order: colOrder
      }
    });

    response.status(201).json({ message: "Column created successfully.", column });
  } catch (error) {
    console.error("Failed to create Kanban column:", error);
    response.status(500).json({ message: "Failed to create column." });
  }
}

// Update Kanban Column
export async function updateColumn(request: Request, response: Response) {
  const { id } = request.params; // Column ID
  const { title, order } = request.body;

  try {
    const exists = await prisma.kanbanColumn.findUnique({
      where: { id }
    });

    if (!exists) {
      response.status(404).json({ message: "Column not found." });
      return;
    }

    const column = await prisma.kanbanColumn.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        order: order !== undefined ? Number(order) : undefined
      }
    });

    response.status(200).json({ message: "Column updated successfully.", column });
  } catch (error) {
    console.error("Failed to update Kanban column:", error);
    response.status(500).json({ message: "Failed to update column." });
  }
}

// Delete Kanban Column
export async function deleteColumn(request: Request, response: Response) {
  const { id } = request.params; // Column ID

  try {
    const exists = await prisma.kanbanColumn.findUnique({
      where: { id }
    });

    if (!exists) {
      response.status(404).json({ message: "Column not found." });
      return;
    }

    await prisma.kanbanColumn.delete({
      where: { id }
    });

    response.status(200).json({ message: "Column deleted successfully." });
  } catch (error) {
    console.error("Failed to delete Kanban column:", error);
    response.status(500).json({ message: "Failed to delete column." });
  }
}

// Create Kanban Card
export async function createCard(request: Request, response: Response) {
  const { id } = request.params; // project ID
  const { columnId, title, description, assigneeId, assigneeIds, dueDate, priority, order } = request.body;

  if (!columnId || !title) {
    response.status(400).json({ message: "ColumnId and title are required." });
    return;
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id }
    });

    if (!project) {
      response.status(404).json({ message: "Project not found." });
      return;
    }

    const actualAssigneeIds: string[] = Array.isArray(assigneeIds)
      ? assigneeIds
      : (assigneeId ? [assigneeId] : []);

    const card = await prisma.kanbanCard.create({
      data: {
        projectId: id,
        columnId,
        title,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || "MEDIUM",
        order: order !== undefined ? Number(order) : 1,
        assignees: {
          connect: actualAssigneeIds.map((uid: string) => ({ id: uid }))
        }
      },
      include: {
        assignees: { select: { id: true, name: true, email: true, avatarUrl: true } }
      }
    });

    const creatorId = request.user?.userId || request.user?.id || "system";
    logActivity(creatorId, "CREATED_CARD", id, card.id, `Created task "${title}"`);

    // Automatically send task assignment notifications
    if (card.assignees && card.assignees.length > 0) {
      for (const assignee of card.assignees) {
        if (assignee.id !== creatorId) {
          await createNotification({
            recipientId: assignee.id,
            title: "New Task Assigned",
            message: `You have been assigned to task "${card.title}" in project "${project.name}".`,
            type: "TASK_ASSIGNMENT",
            link: `/projects/${project.id}`
          });
        }
      }
    }

    response.status(201).json({ message: "Task card created successfully.", card });
  } catch (error) {
    console.error("Failed to create Kanban card:", error);
    response.status(500).json({ message: "Failed to create task card." });
  }
}

// Update Kanban Card (including assignee/column movements & triggers)
export async function updateCard(request: Request, response: Response) {
  const { id } = request.params; // Card ID
  const { columnId, title, description, assigneeId, assigneeIds, dueDate, priority, order, projectId } = request.body;
  
  const updaterId = request.user?.userId || request.user?.id;
  let updaterName = request.user?.email || "Team Member";

  try {
    if (updaterId) {
      const dbUser = await prisma.user.findUnique({ where: { id: updaterId } });
      if (dbUser) {
        updaterName = dbUser.name;
      }
    }

    const oldCard = await prisma.kanbanCard.findUnique({
      where: { id },
      include: {
        project: true,
        assignees: true,
        column: true
      }
    });

    if (!oldCard) {
      response.status(404).json({ message: "Task card not found." });
      return;
    }

    const actualAssigneeIds: string[] | undefined = assigneeIds !== undefined
      ? (Array.isArray(assigneeIds) ? assigneeIds : [])
      : (assigneeId !== undefined ? (assigneeId ? [assigneeId] : []) : undefined);

    const updated = await prisma.kanbanCard.update({
      where: { id },
      data: {
        columnId: columnId !== undefined ? columnId : undefined,
        projectId: projectId !== undefined ? projectId : undefined,
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
        priority: priority !== undefined ? priority : undefined,
        order: order !== undefined ? Number(order) : undefined,
        ...(actualAssigneeIds !== undefined ? {
          assignees: {
            set: actualAssigneeIds.map((uid: string) => ({ id: uid }))
          }
        } : {})
      },
      include: {
        assignees: { select: { id: true, name: true, email: true, avatarUrl: true } },
        column: true,
        checklistItems: { orderBy: { order: "asc" } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { id: true, name: true, avatarUrl: true } } }
        }
      }
    });

    // 1. Task Assignment Trigger
    if (actualAssigneeIds !== undefined) {
      const oldAssigneeIds = oldCard.assignees.map(a => a.id);
      const newlyAssigned = updated.assignees.filter(a => !oldAssigneeIds.includes(a.id));
      for (const assignee of newlyAssigned) {
        if (assignee.id !== updaterId) {
          await createNotification({
            recipientId: assignee.id,
            title: "Task Assigned",
            message: `You have been assigned to task "${updated.title}" in project "${oldCard.project.name}".`,
            type: "TASK_ASSIGNMENT",
            link: `/projects/${oldCard.projectId}`
          });
        }
      }
    }

    // 2. Task Completion Trigger
    const columnChanged = columnId !== undefined && columnId !== oldCard.columnId;
    const isNowDone = columnChanged && (
      updated.column.title.toLowerCase().includes("completed") ||
      updated.column.title.toLowerCase().includes("done")
    );

    if (isNowDone) {
      const assigneesToNotify = updated.assignees.filter(a => a.id !== updaterId);
      for (const assignee of assigneesToNotify) {
        await createNotification({
          recipientId: assignee.id,
          title: "Task Completed",
          message: `The task "${updated.title}" has been completed by ${updaterName}.`,
          type: "TASK_COMPLETION",
          link: `/projects/${oldCard.projectId}`
        });
      }
      logActivity(updaterId || "system", "COMPLETED_CARD", oldCard.projectId, id, `Completed task "${updated.title}"`);
    } else if (columnChanged) {
      logActivity(updaterId || "system", "MOVED_CARD", oldCard.projectId, id, `Moved task "${updated.title}" to "${updated.column.title}"`);
    } else {
      logActivity(updaterId || "system", "UPDATED_CARD", oldCard.projectId, id, `Updated task "${updated.title}"`);
    }

    response.status(200).json({ message: "Task card updated successfully.", card: updated });
  } catch (error) {
    console.error("Failed to update Kanban card:", error);
    response.status(500).json({ message: "Failed to update task card." });
  }
}

// Delete Kanban Card
export async function deleteCard(request: Request, response: Response) {
  const { id } = request.params; // Card ID

  try {
    const exists = await prisma.kanbanCard.findUnique({
      where: { id }
    });

    if (!exists) {
      response.status(404).json({ message: "Task card not found." });
      return;
    }

    await prisma.kanbanCard.delete({
      where: { id }
    });

    logActivity(request.user?.userId || request.user?.id || "system", "DELETED_CARD", exists.projectId, null, `Deleted task "${exists.title}"`);

    response.status(200).json({ message: "Task card deleted successfully." });
  } catch (error) {
    console.error("Failed to delete Kanban card:", error);
    response.status(500).json({ message: "Failed to delete task card." });
  }
}

// Comments: Create
export async function addCardComment(request: Request, response: Response) {
  const { id } = request.params; // Card ID
  const { content } = request.body;
  const userId = request.user?.userId || request.user?.id;

  if (!content || !userId) {
    response.status(400).json({ message: "Content and user are required." });
    return;
  }

  try {
    const comment = await prisma.comment.create({
      data: {
        cardId: id,
        userId,
        content: content.trim()
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } }
      }
    });

    const card = await prisma.kanbanCard.findUnique({ where: { id } });
    if (card) {
      logActivity(userId, "ADDED_COMMENT", card.projectId, id, `Commented on task: "${content.substring(0, 30)}..."`);
    }

    response.status(201).json({ message: "Comment added successfully.", comment });
  } catch (error) {
    console.error("Failed to add comment:", error);
    response.status(500).json({ message: "Failed to add comment." });
  }
}

// Comments: Delete
export async function deleteCardComment(request: Request, response: Response) {
  const { commentId } = request.params;

  try {
    await prisma.comment.delete({
      where: { id: commentId }
    });
    response.status(200).json({ message: "Comment deleted successfully." });
  } catch (error) {
    console.error("Failed to delete comment:", error);
    response.status(500).json({ message: "Failed to delete comment." });
  }
}

// Checklist: Add item
export async function addChecklistItem(request: Request, response: Response) {
  const { id } = request.params; // Card ID
  const { title } = request.body;

  if (!title) {
    response.status(400).json({ message: "Checklist item title is required." });
    return;
  }

  try {
    const count = await prisma.checklistItem.count({ where: { cardId: id } });
    const item = await prisma.checklistItem.create({
      data: {
        cardId: id,
        title: title.trim(),
        order: count + 1,
        isCompleted: false
      }
    });

    response.status(201).json({ message: "Checklist item created.", item });
  } catch (error) {
    console.error("Failed to create checklist item:", error);
    response.status(500).json({ message: "Failed to add checklist item." });
  }
}

// Checklist: Toggle/Update item
export async function updateChecklistItem(request: Request, response: Response) {
  const { itemId } = request.params;
  const { isCompleted, title } = request.body;

  try {
    const updated = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        isCompleted: isCompleted !== undefined ? Boolean(isCompleted) : undefined,
        title: title !== undefined ? String(title).trim() : undefined
      }
    });

    response.status(200).json({ message: "Checklist item updated.", item: updated });
  } catch (error) {
    console.error("Failed to update checklist item:", error);
    response.status(500).json({ message: "Failed to update checklist item." });
  }
}

// Checklist: Delete item
export async function deleteChecklistItem(request: Request, response: Response) {
  const { itemId } = request.params;

  try {
    await prisma.checklistItem.delete({
      where: { id: itemId }
    });
    response.status(200).json({ message: "Checklist item deleted." });
  } catch (error) {
    console.error("Failed to delete checklist item:", error);
    response.status(500).json({ message: "Failed to delete checklist item." });
  }
}
