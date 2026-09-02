import type { Request, Response } from "express";
import { prisma } from "../services/prisma.js";

// Generate agency overview analytics for Owner/Admins
export async function getAgencyAnalytics(request: Request, response: Response) {
  try {
    const [
      activeProjectsCount,
      completedProjectsCount,
      activeUsersCount,
      totalTasksCount,
      completedTasksCount,
      pendingInvitationsCount
    ] = await Promise.all([
      prisma.project.count({ where: { status: "ACTIVE" } }),
      prisma.project.count({ where: { status: "COMPLETED" } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.kanbanCard.count(),
      prisma.kanbanCard.count({
        where: {
          column: {
            title: { in: ["Completed", "Done", "completed", "done"] }
          }
        }
      }),
      prisma.invitation.count({ where: { status: "PENDING" } })
    ]);

    const recentProjects = await prisma.project.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        manager: { select: { name: true, email: true } },
        _count: { select: { cards: true, members: true } }
      }
    });

    response.status(200).json({
      metrics: {
        activeProjects: activeProjectsCount,
        completedProjects: completedProjectsCount,
        activeUsers: activeUsersCount,
        totalTasks: totalTasksCount,
        completedTasks: completedTasksCount,
        pendingInvitations: pendingInvitationsCount,
      },
      recentProjects
    });
  } catch (error) {
    console.error("Failed to generate agency analytics:", error);
    response.status(500).json({ message: "Failed to generate agency analytics." });
  }
}

// Generate project status summaries (milestones progress, card stats)
export async function getProjectStatus(request: Request, response: Response) {
  try {
    const projects = await prisma.project.findMany({
      include: {
        milestones: true,
        cards: {
          include: {
            column: true
          }
        }
      }
    });

    const report = projects.map(p => {
      const totalMilestones = p.milestones.length;
      const completedMilestones = p.milestones.filter(m => m.status === "COMPLETED").length;
      const totalTasks = p.cards.length;
      const completedTasks = p.cards.filter(c => 
        c.column.title.toLowerCase().includes("completed") ||
        c.column.title.toLowerCase().includes("done")
      ).length;
      const inProgressTasks = p.cards.filter(c => 
        c.column.title.toLowerCase().includes("in progress") ||
        c.column.title.toLowerCase().includes("review")
      ).length;

      return {
        projectId: p.id,
        name: p.name,
        clientName: p.clientName,
        status: p.status,
        totalMilestones,
        completedMilestones,
        totalTasks,
        completedTasks,
        inProgressTasks
      };
    });

    response.status(200).json({ report });
  } catch (error) {
    console.error("Failed to generate project status report:", error);
    response.status(500).json({ message: "Failed to generate project status report." });
  }
}
