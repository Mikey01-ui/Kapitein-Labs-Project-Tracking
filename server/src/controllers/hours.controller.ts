import type { Request, Response } from "express";
import { prisma } from "../services/prisma.js";
import { logActivity } from "../services/activityService.js";
import { getStoredFileSize } from "../services/storage.js";

// List logs for current user
export async function listMyHours(request: Request, response: Response) {
  const userId = request.user?.userId;
  if (!userId) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const logs = await prisma.hourLog.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      include: {
        project: { select: { id: true, name: true } },
        attachments: true
      }
    });

    const formatted = logs.map(l => ({
      id: l.id,
      userId: l.userId,
      projectId: l.projectId,
      projectName: l.project.name,
      date: l.date.toISOString().split("T")[0],
      hours: Number(l.hours),
      notes: l.notes,
      werkpakket: l.werkpakket,
      imageUrl: l.imageUrl,
      attachments: l.attachments,
      createdAt: l.createdAt.toISOString()
    }));

    response.status(200).json({ logs: formatted });
  } catch (error) {
    console.error("Failed to list my hours:", error);
    response.status(500).json({ message: "Failed to fetch hour logs." });
  }
}

// Log effort hours
export async function createHourLog(request: Request, response: Response) {
  const userId = request.user?.userId;
  const { projectId, cardId, date, hours, notes, werkpakket, imageUrl, imageUrls, startTime, endTime } = request.body;

  if (!userId) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (!projectId || !date || hours === undefined) {
    response.status(400).json({ message: "ProjectId, date, and hours are required." });
    return;
  }

  // Map input files / images to a consolidated list of URLs
  let urls: string[] = [];
  if (Array.isArray(imageUrls)) {
    urls = imageUrls.filter(u => typeof u === "string" && u.length > 0);
  } else if (imageUrl) {
    urls = [imageUrl];
  }

  try {
    const log = await prisma.hourLog.create({
      data: {
        userId,
        projectId,
        cardId: cardId || null,
        date: new Date(date),
        hours: Number(hours),
        notes: notes || null,
        werkpakket: werkpakket || null,
        imageUrl: urls.length > 0 ? urls[0] : null,
        startTime: startTime || null,
        endTime: endTime || null
      },
      include: {
        project: { select: { id: true, name: true } }
      }
    });

    logActivity(userId, "LOGGED_HOURS", projectId, cardId || null, `${hours}h: "${notes || ''}"`);

    // Create attachments for all URLs
    if (urls.length > 0) {
      for (const url of urls) {
        let fileSize = 0;
        try {
          fileSize = await getStoredFileSize(url);
        } catch (err) {
          console.error("Failed to read file size:", err);
        }

        try {
          await prisma.attachment.create({
            data: {
              name: (url.split("?")[0].split("/").pop()) || "proof.png",
              url,
              size: fileSize,
              mimeType: "image/png",
              uploadedById: userId,
              projectId: projectId,
              cardId: cardId || null,
              hourLogId: log.id
            }
          });
        } catch (err) {
          console.error("Failed to create attachment for hour log:", err);
        }
      }
    }

    const logWithAttachments = await prisma.hourLog.findUnique({
      where: { id: log.id },
      include: {
        project: { select: { id: true, name: true } },
        attachments: true
      }
    });

    if (!logWithAttachments) {
      response.status(500).json({ message: "Failed to log effort hours." });
      return;
    }

    response.status(201).json({
      message: "Hour log created successfully.",
      log: {
        id: logWithAttachments.id,
        userId: logWithAttachments.userId,
        projectId: logWithAttachments.projectId,
        projectName: logWithAttachments.project.name,
        cardId: logWithAttachments.cardId,
        date: logWithAttachments.date.toISOString().split("T")[0],
        hours: Number(logWithAttachments.hours),
        notes: logWithAttachments.notes,
        werkpakket: logWithAttachments.werkpakket,
        imageUrl: logWithAttachments.imageUrl,
        attachments: logWithAttachments.attachments,
        createdAt: logWithAttachments.createdAt.toISOString()
      }
    });
  } catch (error) {
    console.error("Failed to create hour log:", error);
    response.status(500).json({ message: "Failed to log effort hours." });
  }
}

// Update hour log
export async function updateHourLog(request: Request, response: Response) {
  const { id } = request.params;
  const { projectId, cardId, date, hours, notes, werkpakket, imageUrl, imageUrls, startTime, endTime } = request.body;
  const userId = request.user?.userId;
  const role = request.user?.role;

  if (!userId) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const existing = await prisma.hourLog.findUnique({
      where: { id }
    });

    if (!existing) {
      response.status(404).json({ message: "Hour log not found." });
      return;
    }

    if (existing.userId !== userId && role !== "ADMIN" && role !== "MANAGER") {
      response.status(403).json({ message: "You are not authorized to update this hour log." });
      return;
    }

    let urls: string[] | undefined = undefined;
    if (imageUrls !== undefined || imageUrl !== undefined) {
      urls = [];
      if (Array.isArray(imageUrls)) {
        urls = imageUrls.filter(u => typeof u === "string");
      } else if (imageUrl) {
        urls = [imageUrl];
      }
    }

    const updated = await prisma.hourLog.update({
      where: { id },
      data: {
        projectId: projectId !== undefined ? projectId : undefined,
        cardId: cardId !== undefined ? (cardId || null) : undefined,
        date: date !== undefined ? new Date(date) : undefined,
        hours: hours !== undefined ? Number(hours) : undefined,
        notes: notes !== undefined ? (notes || null) : undefined,
        werkpakket: werkpakket !== undefined ? (werkpakket || null) : undefined,
        imageUrl: urls !== undefined ? (urls.length > 0 ? urls[0] : null) : undefined,
        startTime: startTime !== undefined ? (startTime || null) : undefined,
        endTime: endTime !== undefined ? (endTime || null) : undefined
      },
      include: {
        project: { select: { id: true, name: true } },
        attachments: true
      }
    });

    logActivity(userId, "UPDATED_HOURS", updated.projectId, updated.cardId || null, `${updated.hours}h: "${updated.notes || ''}"`);

    if (urls !== undefined) {
      try {
        // First delete existing attachments
        await prisma.attachment.deleteMany({
          where: { hourLogId: id }
        });

        // Create new ones
        for (const url of urls) {
          let fileSize = 0;
          try {
            fileSize = await getStoredFileSize(url);
          } catch (err) {
            console.error("Failed to read file size:", err);
          }

          await prisma.attachment.create({
            data: {
              name: (url.split("?")[0].split("/").pop()) || "proof.png",
              url,
              size: fileSize,
              mimeType: "image/png",
              uploadedById: userId,
              projectId: updated.projectId,
              cardId: updated.cardId || null,
              hourLogId: id
            }
          });
        }
      } catch (err) {
        console.error("Failed to sync attachments:", err);
      }
    }

    // Refetch updated to get full synced attachments array (in case we created or deleted one above)
    const logWithAttachments = await prisma.hourLog.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        attachments: true
      }
    });

    if (!logWithAttachments) {
      response.status(500).json({ message: "Failed to update hour log." });
      return;
    }

    response.status(200).json({
      message: "Hour log updated successfully.",
      log: {
        id: logWithAttachments.id,
        userId: logWithAttachments.userId,
        projectId: logWithAttachments.projectId,
        projectName: logWithAttachments.project.name,
        cardId: logWithAttachments.cardId,
        date: logWithAttachments.date.toISOString().split("T")[0],
        hours: Number(logWithAttachments.hours),
        notes: logWithAttachments.notes,
        werkpakket: logWithAttachments.werkpakket,
        imageUrl: logWithAttachments.imageUrl,
        attachments: logWithAttachments.attachments,
        createdAt: logWithAttachments.createdAt.toISOString()
      }
    });
  } catch (error) {
    console.error("Failed to update hour log:", error);
    response.status(500).json({ message: "Failed to update hour log." });
  }
}

// Delete hour log
export async function deleteHourLog(request: Request, response: Response) {
  const { id } = request.params;
  const userId = request.user?.userId;
  const role = request.user?.role;

  if (!userId) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const existing = await prisma.hourLog.findUnique({
      where: { id }
    });

    if (!existing) {
      response.status(404).json({ message: "Hour log not found." });
      return;
    }

    if (existing.userId !== userId && role !== "ADMIN" && role !== "MANAGER") {
      response.status(403).json({ message: "You are not authorized to delete this hour log." });
      return;
    }

    await prisma.hourLog.delete({
      where: { id }
    });

    logActivity(userId, "DELETED_HOURS", existing.projectId, null, `Deleted ${existing.hours}h logged on ${existing.date.toISOString().split("T")[0]}`);

    response.status(200).json({ message: "Hour log deleted successfully." });
  } catch (error) {
    console.error("Failed to delete hour log:", error);
    response.status(500).json({ message: "Failed to delete hour log." });
  }
}

// List logs for a project
export async function listProjectHours(request: Request, response: Response) {
  const { id } = request.params;

  try {
    const logs = await prisma.hourLog.findMany({
      where: { projectId: id },
      orderBy: { date: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        attachments: true
      }
    });

    const formatted = logs.map(l => ({
      id: l.id,
      userId: l.userId,
      projectId: l.projectId,
      userName: l.user.name,
      userEmail: l.user.email,
      date: l.date.toISOString().split("T")[0],
      hours: Number(l.hours),
      notes: l.notes,
      werkpakket: l.werkpakket,
      imageUrl: l.imageUrl,
      attachments: l.attachments,
      createdAt: l.createdAt.toISOString()
    }));

    response.status(200).json({ logs: formatted });
  } catch (error) {
    console.error("Failed to list project hours:", error);
    response.status(500).json({ message: "Failed to fetch project hour logs." });
  }
}

// List logs for a specific user
export async function listUserHours(request: Request, response: Response) {
  const { id } = request.params;
  const role = request.user?.role;
  const currentUserId = request.user?.userId;

  if (currentUserId !== id && role !== "ADMIN" && role !== "MANAGER") {
    response.status(403).json({ message: "Not authorized to view user hours." });
    return;
  }

  try {
    const logs = await prisma.hourLog.findMany({
      where: { userId: id },
      orderBy: { date: "desc" },
      include: {
        project: { select: { id: true, name: true } },
        attachments: true
      }
    });

    const formatted = logs.map(l => ({
      id: l.id,
      userId: l.userId,
      projectId: l.projectId,
      projectName: l.project.name,
      date: l.date.toISOString().split("T")[0],
      hours: Number(l.hours),
      notes: l.notes,
      werkpakket: l.werkpakket,
      imageUrl: l.imageUrl,
      attachments: l.attachments,
      createdAt: l.createdAt.toISOString()
    }));

    response.status(200).json({ logs: formatted });
  } catch (error) {
    console.error("Failed to list user hours:", error);
    response.status(500).json({ message: "Failed to fetch user hour logs." });
  }
}

// List logs for a specific Kanban card
export async function listCardHours(request: Request, response: Response) {
  const { cardId } = request.params;

  try {
    const logs = await prisma.hourLog.findMany({
      where: { cardId },
      orderBy: { date: "desc" },
      include: {
        project: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        attachments: true
      }
    });

    const formatted = logs.map(l => ({
      id: l.id,
      userId: l.userId,
      userName: l.user.name,
      userEmail: l.user.email,
      userAvatarUrl: l.user.avatarUrl,
      projectId: l.projectId,
      projectName: l.project.name,
      cardId: l.cardId,
      date: l.date.toISOString().split("T")[0],
      hours: Number(l.hours),
      notes: l.notes,
      werkpakket: l.werkpakket,
      imageUrl: l.imageUrl,
      attachments: l.attachments,
      createdAt: l.createdAt.toISOString()
    }));

    response.status(200).json({ logs: formatted });
  } catch (error) {
    console.error("Failed to list card hours:", error);
    response.status(500).json({ message: "Failed to fetch card hour logs." });
  }
}
