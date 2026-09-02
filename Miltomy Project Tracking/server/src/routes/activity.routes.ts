import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { prisma } from "../services/prisma.js";

export const activityRouter = Router();

// Fetch recent activity logs across all assigned projects
activityRouter.get("/", requireAuth, async (req, res) => {
  try {
    const activities = await prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 30, // Let's take more logs to make the feed richer
      include: {
        user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
        project: { select: { id: true, name: true } },
        card: { select: { id: true, title: true } }
      }
    });

    res.status(200).json({ activities });
  } catch (error) {
    console.error("Failed to list activities:", error);
    res.status(500).json({ message: "Failed to fetch workspace activities." });
  }
});

// Log a custom activity (e.g. from frontend client actions like system settings updates)
activityRouter.post("/log", requireAuth, async (req, res) => {
  const { actionType, details, projectId, cardId } = req.body;
  if (!actionType) {
    res.status(400).json({ message: "actionType is required." });
    return;
  }
  try {
    const userId = req.user!.userId;
    const activity = await prisma.activityLog.create({
      data: {
        userId,
        projectId: projectId || null,
        cardId: cardId || null,
        actionType,
        details: details || null
      }
    });
    res.status(201).json({ message: "Activity logged successfully.", activity });
  } catch (error) {
    console.error("Failed to log activity:", error);
    res.status(500).json({ message: "Failed to record activity log." });
  }
});
