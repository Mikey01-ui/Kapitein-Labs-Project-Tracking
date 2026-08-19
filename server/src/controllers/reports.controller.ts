import type { Request, Response } from "express";
import { prisma } from "../services/prisma.js";

// Generate hours logged by person
export async function getHoursByPerson(request: Request, response: Response) {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        weeklyTargetHours: true,
        hourLogs: {
          select: {
            hours: true
          }
        }
      }
    });

    const report = users.map(u => {
      const totalHours = u.hourLogs.reduce((sum, log) => sum + Number(log.hours), 0);
      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        weeklyTargetHours: u.weeklyTargetHours,
        totalHours
      };
    });

    response.status(200).json({ report });
  } catch (error) {
    console.error("Failed to generate hours by person report:", error);
    response.status(500).json({ message: "Failed to generate hours by person report." });
  }
}

// Generate hours logged by project
export async function getHoursByProject(request: Request, response: Response) {
  try {
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        currentTRL: true,
        hourLogs: {
          select: {
            hours: true
          }
        }
      }
    });

    const report = projects.map(p => {
      const totalHours = p.hourLogs.reduce((sum, log) => sum + Number(log.hours), 0);
      return {
        projectId: p.id,
        name: p.name,
        status: p.status,
        currentTRL: p.currentTRL,
        totalHours
      };
    });

    response.status(200).json({ report });
  } catch (error) {
    console.error("Failed to generate hours by project report:", error);
    response.status(500).json({ message: "Failed to generate hours by project report." });
  }
}

// Generate project status summaries (milestones progress, card stats, TRL, effort hours)
export async function getProjectStatus(request: Request, response: Response) {
  try {
    const projects = await prisma.project.findMany({
      include: {
        milestones: true,
        cards: {
          include: {
            column: true
          }
        },
        hourLogs: {
          select: {
            hours: true
          }
        }
      }
    });

    const report = projects.map(p => {
      const totalMilestones = p.milestones.length;
      const completedMilestones = p.milestones.filter(m => m.status === "COMPLETED").length;
      const totalTasks = p.cards.length;
      const completedTasks = p.cards.filter(c => 
        c.columnId === "column-done" ||
        c.column.title.toLowerCase() === "completed" ||
        c.column.title.toLowerCase() === "done"
      ).length;
      const inProgressTasks = p.cards.filter(c => 
        c.column.title.toLowerCase() === "in progress" ||
        c.column.title.toLowerCase() === "in review"
      ).length;

      const totalHours = p.hourLogs.reduce((sum, log) => sum + Number(log.hours), 0);

      return {
        projectId: p.id,
        name: p.name,
        status: p.status,
        currentTRL: p.currentTRL,
        totalMilestones,
        completedMilestones,
        totalTasks,
        completedTasks,
        inProgressTasks,
        totalHours
      };
    });

    response.status(200).json({ report });
  } catch (error) {
    console.error("Failed to generate project status report:", error);
    response.status(500).json({ message: "Failed to generate project status report." });
  }
}
