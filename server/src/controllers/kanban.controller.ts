import type { Request, Response } from "express";
import { prisma } from "../services/prisma.js";
import { emailService } from "../services/emailService.js";
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
            hourLogs: { select: { hours: true } }
          }
        }
      }
    });

    const formattedColumns = columns.map(col => ({
      ...col,
      cards: col.cards.map(card => {
        const totalHours = card.hourLogs.reduce((sum, log) => sum + Number(log.hours), 0);
        const { hourLogs, ...cardData } = card;
        return {
          ...cardData,
          totalLoggedHours: totalHours
        };
      })
    }));

    response.status(200).json({ columns: formattedColumns });
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
  const { columnId, title, description, assigneeId, assigneeIds, dueDate, priority, order, trlLevel } = request.body;

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
        trlLevel: trlLevel !== undefined ? Number(trlLevel) : null,
        assignees: {
          connect: actualAssigneeIds.map((uid: string) => ({ id: uid }))
        }
      },
      include: {
        assignees: { select: { id: true, name: true, email: true, avatarUrl: true } }
      }
    });

    const creatorId = request.user?.userId || "system";
    logActivity(creatorId, "CREATED_CARD", id, card.id, `Created task "${title}"`);

    // Automatically send task assignment email if assigned on creation
    if (card.assignees && card.assignees.length > 0) {
      for (const assignee of card.assignees) {
        await createNotification({
          recipientId: assignee.id,
          title: "New Task Assigned",
          message: `You have been assigned to task "${card.title}" in project "${project.name}".`,
          type: "TASK_ASSIGNMENT",
          link: `/projects/${project.id}/kanban`
        });
      }
    } else {
      // If no assignee is set on creation, notify admins anyway
      prisma.user.findMany({ where: { role: "ADMIN", isActive: true } })
        .then(admins => {
          const adminEmails = admins.map(a => a.email).filter(Boolean);
          const promises = adminEmails.map(email =>
            emailService.sendMail({
              to: email,
              subject: `[Project Tracker] New Unassigned Task Created: ${card.title}`,
              text: `A new unassigned task "${card.title}" has been created in project "${project.name}".\n\nPriority: ${card.priority}\nDescription: ${card.description || "No description provided."}`,
              html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #080f1f; color: #ffffff; padding: 24px; border-radius: 12px; max-width: 600px; border: 1px solid #1B2A3F;">
                <h2 style="color: #00e5c8; margin-top: 0; font-weight: 900;">PROJECT<span style="color: #ffffff;">TRACKER</span></h2>
                <div style="border-top: 1px dashed #1B2A3F; margin: 16px 0;"></div>
                <p style="font-size: 15px; line-height: 1.6;">A new unassigned task has been created on project <strong>${project.name}</strong>:</p>
                <div style="background-color: #121e30; border: 1px solid #253347; padding: 18px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #ffffff; margin-top: 0; margin-bottom: 8px; font-size: 16px;">🎯 ${card.title}</h3>
                  <p style="color: #8f98aa; font-size: 13px; margin: 0 0 16px 0; line-height: 1.5;">${card.description || "<em>No description provided.</em>"}</p>
                  <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <span style="font-size: 10px; font-weight: bold; background-color: #1B2A3F; color: #ffffff; padding: 4px 8px; border-radius: 4px; border: 1px solid #253347;">
                      Priority: ${card.priority}
                    </span>
                  </div>
                </div>
              </div>`
            }).catch(err => console.error("Failed to copy admin on unassigned task creation:", err))
          );
          return Promise.allSettled(promises);
        })
        .catch(e => console.error("Failed to alert admins of unassigned task creation:", e));
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
  const { columnId, title, description, assigneeId, assigneeIds, dueDate, priority, order, trlLevel } = request.body;
  
  let updaterName = request.user?.email || "Team Member";
  const updaterId = request.user?.userId;

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
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
        priority: priority !== undefined ? priority : undefined,
        order: order !== undefined ? Number(order) : undefined,
        trlLevel: trlLevel !== undefined ? (trlLevel ? Number(trlLevel) : null) : undefined,
        ...(actualAssigneeIds !== undefined ? {
          assignees: {
            set: actualAssigneeIds.map((uid: string) => ({ id: uid }))
          }
        } : {})
      },
      include: {
        assignees: { select: { id: true, name: true, email: true, avatarUrl: true } },
        column: true
      }
    });

    // 1. Task Assignment Trigger: If assignee list has changed and contains newly added members
    if (actualAssigneeIds !== undefined) {
      const oldAssigneeIds = oldCard.assignees.map(a => a.id);
      const newlyAssigned = updated.assignees.filter(a => !oldAssigneeIds.includes(a.id));
      for (const assignee of newlyAssigned) {
        await createNotification({
          recipientId: assignee.id,
          title: "Task Assigned",
          message: `You have been assigned to task "${updated.title}" in project "${oldCard.project.name}".`,
          type: "TASK_ASSIGNMENT",
          link: `/projects/${oldCard.projectId}/kanban`
        });
      }
    }

    // 2. Task Completion Trigger: If column changed to Done / Completed
    const columnChanged = columnId !== undefined && columnId !== oldCard.columnId;
    const isNowDone = columnChanged && (
      updated.columnId === "column-done" ||
      updated.column.title.toLowerCase() === "completed" ||
      updated.column.title.toLowerCase() === "done"
    );

    if (isNowDone) {
      const assigneesToNotify = updated.assignees.filter(a => a.id !== updaterId);
      
      if (assigneesToNotify.length > 0) {
        for (const assignee of assigneesToNotify) {
          await createNotification({
            recipientId: assignee.id,
            title: "Task Completed",
            message: `The task "${updated.title}" has been completed by ${updaterName}.`,
            type: "TASK_COMPLETION",
            link: `/projects/${oldCard.projectId}/kanban`
          });
        }
      } else if (updated.assignees.length === 0) {
        // Fallback: If no assignee is set on the task, notify admins anyway!
        try {
          const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true } });
          const adminEmails = admins.map(a => a.email).filter(Boolean);
          const promises = adminEmails.map(email =>
            emailService.sendMail({
              to: email,
              subject: `[Project Tracker] Unassigned Task Completed: ${updated.title}`,
              text: `The unassigned task "${updated.title}" on project "${oldCard.project.name}" was marked as Completed by ${updaterName}.`,
              html: `<p>The unassigned task <strong>${updated.title}</strong> on project <strong>${oldCard.project.name}</strong> was marked as Completed by ${updaterName}.</p>`
            }).catch(err => console.error("Failed to copy admin on unassigned task completion:", err))
          );
          await Promise.allSettled(promises);
        } catch (e) {
          console.error("Failed to alert admins of unassigned task completion:", e);
        }
      }
    }

    if (isNowDone) {
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

    logActivity(request.user?.userId || "system", "DELETED_CARD", exists.projectId, null, `Deleted task "${exists.title}"`);

    response.status(200).json({ message: "Task card deleted successfully." });
  } catch (error) {
    console.error("Failed to delete Kanban card:", error);
    response.status(500).json({ message: "Failed to delete task card." });
  }
}
