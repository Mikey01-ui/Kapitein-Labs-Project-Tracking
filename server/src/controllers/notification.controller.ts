import type { Request, Response } from "express";
import { emailService } from "../services/emailService.js";
import { prisma } from "../services/prisma.js";

export async function sendEmailNotification(request: Request, response: Response) {
  const { type, recipientId, variables } = request.body;

  try {
    if (!type || !recipientId || !variables) {
      response.status(400).json({ message: "Type, recipientId, and variables are required." });
      return;
    }

    // Lookup recipient user
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId }
    });

    if (!recipient) {
      response.status(404).json({ message: "Recipient user not found." });
      return;
    }

    if (!recipient.email) {
      response.status(400).json({ message: "Recipient user has no email address." });
      return;
    }

    let info;
    if (type === "PROJECT_ASSIGNMENT") {
      const { projectName, description, managerName } = variables;
      info = await emailService.sendProjectAssignmentEmail({
        to: recipient.email,
        userName: recipient.name,
        projectName,
        description: description || "No description provided.",
        managerName: managerName || "Project Administrator",
        recipientId: recipient.id
      });
    } else if (type === "TASK_ASSIGNMENT") {
      const { taskTitle, description, priority, projectName, dueDate } = variables;
      info = await emailService.sendTaskAssignmentEmail({
        to: recipient.email,
        userName: recipient.name,
        taskTitle,
        description: description || "",
        priority: priority || "MEDIUM",
        projectName: projectName || "Assigned Project",
        dueDate: dueDate || "",
        recipientId: recipient.id
      });
    } else {
      response.status(400).json({ message: `Invalid notification type: ${type}` });
      return;
    }

    response.status(200).json({
      message: "Notification email sent successfully.",
      messageId: info.messageId
    });
  } catch (error) {
    console.error("Failed to send notification email:", error);
    response.status(500).json({ message: "Failed to send email notification." });
  }
}

export async function getNotifications(request: Request, response: Response) {
  const userId = request.user?.userId;
  if (!userId) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: "desc" }
    });
    response.status(200).json({ notifications });
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    response.status(500).json({ message: "Failed to fetch notifications." });
  }
}

export async function markAsRead(request: Request, response: Response) {
  const userId = request.user?.userId;
  const { id } = request.params;
  if (!userId) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const result = await prisma.notification.updateMany({
      where: { id, recipientId: userId },
      data: { isRead: true }
    });
    response.status(200).json({ message: "Notification marked as read.", count: result.count });
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    response.status(500).json({ message: "Failed to mark notification as read." });
  }
}

export async function markAllAsRead(request: Request, response: Response) {
  const userId = request.user?.userId;
  if (!userId) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const result = await prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true }
    });
    response.status(200).json({ message: "All notifications marked as read.", count: result.count });
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
    response.status(500).json({ message: "Failed to mark all notifications as read." });
  }
}
