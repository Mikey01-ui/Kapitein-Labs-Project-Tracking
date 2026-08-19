import type { Request, Response } from "express";
import { prisma } from "../services/prisma.js";
import { logActivity } from "../services/activityService.js";

// List milestones for a project
export async function listMilestones(request: Request, response: Response) {
  const { id } = request.params; // project ID

  try {
    const milestones = await prisma.milestone.findMany({
      where: { projectId: id },
      orderBy: { dueDate: "asc" }
    });

    const formatted = milestones.map(m => ({
      id: m.id,
      projectId: m.projectId,
      name: m.name,
      dueDate: m.dueDate.toISOString().split("T")[0],
      status: m.status,
      completedAt: m.completedAt ? m.completedAt.toISOString().split("T")[0] : null,
      notes: m.notes
    }));

    response.status(200).json({ milestones: formatted });
  } catch (error) {
    console.error("Failed to list milestones:", error);
    response.status(500).json({ message: "Failed to fetch milestones." });
  }
}

// Create Milestone
export async function createMilestone(request: Request, response: Response) {
  const { id } = request.params; // project ID
  const { name, dueDate, status, notes } = request.body;

  if (!name || !dueDate) {
    response.status(400).json({ message: "Name and dueDate are required." });
    return;
  }

  try {
    const milestone = await prisma.milestone.create({
      data: {
        projectId: id,
        name,
        dueDate: new Date(dueDate),
        status: status || "PENDING",
        notes: notes || null
      }
    });

    logActivity(
      request.user?.userId || "system",
      "CREATED_MILESTONE",
      id,
      null,
      `Created milestone "${name}"`
    );

    response.status(201).json({
      message: "Milestone created successfully.",
      milestone: {
        ...milestone,
        dueDate: milestone.dueDate.toISOString().split("T")[0]
      }
    });
  } catch (error) {
    console.error("Failed to create milestone:", error);
    response.status(500).json({ message: "Failed to create milestone." });
  }
}

// Update Milestone
export async function updateMilestone(request: Request, response: Response) {
  const { id } = request.params; // Milestone ID
  const { name, dueDate, status, notes } = request.body;

  try {
    const exists = await prisma.milestone.findUnique({
      where: { id }
    });

    if (!exists) {
      response.status(404).json({ message: "Milestone not found." });
      return;
    }

    const isNowCompleted = status === "COMPLETED" && exists.status !== "COMPLETED";

    const milestone = await prisma.milestone.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        dueDate: dueDate !== undefined ? new Date(dueDate) : undefined,
        status: status !== undefined ? status : undefined,
        notes: notes !== undefined ? (notes || null) : undefined,
        completedAt: isNowCompleted ? new Date() : (status !== undefined && status !== "COMPLETED" ? null : undefined)
      }
    });

    if (isNowCompleted) {
      logActivity(
        request.user?.userId || "system",
        "COMPLETED_MILESTONE",
        milestone.projectId,
        null,
        `Completed milestone "${milestone.name}"`
      );
    } else {
      logActivity(
        request.user?.userId || "system",
        "UPDATED_MILESTONE",
        milestone.projectId,
        null,
        `Updated milestone "${milestone.name}"`
      );
    }

    response.status(200).json({
      message: "Milestone updated successfully.",
      milestone: {
        ...milestone,
        dueDate: milestone.dueDate.toISOString().split("T")[0],
        completedAt: milestone.completedAt ? milestone.completedAt.toISOString().split("T")[0] : null
      }
    });
  } catch (error) {
    console.error("Failed to update milestone:", error);
    response.status(500).json({ message: "Failed to update milestone." });
  }
}

// Delete Milestone
export async function deleteMilestone(request: Request, response: Response) {
  const { id } = request.params; // Milestone ID

  try {
    const exists = await prisma.milestone.findUnique({
      where: { id }
    });

    if (!exists) {
      response.status(404).json({ message: "Milestone not found." });
      return;
    }

    await prisma.milestone.delete({
      where: { id }
    });

    logActivity(
      request.user?.userId || "system",
      "DELETED_MILESTONE",
      exists.projectId,
      null,
      `Deleted milestone "${exists.name}"`
    );

    response.status(200).json({ message: "Milestone deleted successfully." });
  } catch (error) {
    console.error("Failed to delete milestone:", error);
    response.status(500).json({ message: "Failed to delete milestone." });
  }
}
