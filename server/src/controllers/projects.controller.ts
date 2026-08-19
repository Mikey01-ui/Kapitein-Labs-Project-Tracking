import type { Request, Response } from "express";
import { prisma } from "../services/prisma.js";
import { createNotification } from "../services/notificationService.js";
import { logActivity } from "../services/activityService.js";

// Role-aware project listing
export async function listProjects(request: Request, response: Response) {
  const userId = request.user?.userId;
  const userRole = request.user?.role;

  try {
    let projects;
    if (userRole === "ADMIN") {
      projects = await prisma.project.findMany({
        orderBy: { createdAt: "asc" },
        include: {
          manager: { select: { id: true, name: true, email: true, avatarUrl: true } },
          members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } }
        }
      });
    } else {
      projects = await prisma.project.findMany({
        where: {
          OR: [
            { managerId: userId },
            { createdById: userId },
            { members: { some: { userId } } }
          ]
        },
        orderBy: { createdAt: "asc" },
        include: {
          manager: { select: { id: true, name: true, email: true, avatarUrl: true } },
          members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } }
        }
      });
    }

    const formatted = projects.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      startDate: p.startDate.toISOString().split("T")[0],
      status: p.status,
      currentTRL: p.currentTRL,
      createdBy: p.createdById,
      managerId: p.managerId,
      memberIds: p.members.map(m => m.userId),
      createdAt: p.createdAt.toISOString().split("T")[0],
      updatedAt: p.updatedAt.toISOString().split("T")[0],
      manager: p.manager,
      members: p.members.map(m => m.user)
    }));

    response.status(200).json({ projects: formatted });
  } catch (error) {
    console.error("Failed to list projects:", error);
    response.status(500).json({ message: "Failed to list projects." });
  }
}

// Get single project details
export async function getProject(request: Request, response: Response) {
  const { id } = request.params;

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        milestones: { orderBy: { dueDate: "asc" } },
        columns: {
          orderBy: { order: "asc" },
          include: { cards: { orderBy: { order: "asc" }, include: { assignees: { select: { id: true, name: true, email: true, avatarUrl: true } } } } }
        }
      }
    });

    if (!project) {
      response.status(404).json({ message: "Project not found." });
      return;
    }

    const formatted = {
      id: project.id,
      name: project.name,
      description: project.description,
      startDate: project.startDate.toISOString().split("T")[0],
      status: project.status,
      currentTRL: project.currentTRL,
      createdBy: project.createdById,
      managerId: project.managerId,
      memberIds: project.members.map(m => m.userId),
      createdAt: project.createdAt.toISOString().split("T")[0],
      updatedAt: project.updatedAt.toISOString().split("T")[0],
      manager: project.manager,
      members: project.members.map(m => m.user),
      milestones: project.milestones.map(m => ({
        id: m.id,
        projectId: m.projectId,
        name: m.name,
        dueDate: m.dueDate.toISOString().split("T")[0],
        status: m.status
      })),
      columns: project.columns
    };

    response.status(200).json({ project: formatted });
  } catch (error) {
    console.error("Failed to get project details:", error);
    response.status(500).json({ message: "Failed to fetch project details." });
  }
}

// Create new project
export async function createProject(request: Request, response: Response) {
  const { name, description, startDate, managerId, currentTRL } = request.body;
  const creatorId = request.user?.userId;

  if (!name || !description || !startDate || !managerId) {
    response.status(400).json({ message: "Name, description, startDate, and managerId are required." });
    return;
  }

  try {
    const project = await prisma.project.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        currentTRL: currentTRL ? Number(currentTRL) : 1,
        createdById: creatorId!,
        managerId,
        // Auto create default Kanban columns
        columns: {
          create: [
            { title: "To Do", order: 1, id: `column-todo-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36)}` },
            { title: "In Progress", order: 2, id: `column-progress-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36)}` },
            { title: "In Review", order: 3, id: `column-review-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36)}` },
            { title: "Completed", order: 4, id: `column-done-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36)}` }
          ]
        }
      }
    });

    // Automatically add manager and creator as members of the project
    await prisma.projectMember.createMany({
      data: Array.from(new Set([creatorId!, managerId])).map(uid => ({
        projectId: project.id,
        userId: uid
      })),
      skipDuplicates: true
    });

    logActivity(creatorId!, "CREATED_PROJECT", project.id, null, `Created project "${name}"`);

    response.status(201).json({ message: "Project created successfully.", project });
  } catch (error) {
    console.error("Failed to create project:", error);
    response.status(500).json({ message: "Failed to create project." });
  }
}

// Update project
export async function updateProject(request: Request, response: Response) {
  const { id } = request.params;
  const { name, description, startDate, status, currentTRL, managerId } = request.body;
  const userId = request.user?.userId;

  try {
    const project = await prisma.project.findUnique({
      where: { id }
    });

    if (!project) {
      response.status(404).json({ message: "Project not found." });
      return;
    }

    const prevTRL = project.currentTRL;
    const isTrlUpgrade = currentTRL !== undefined && Number(currentTRL) !== prevTRL;

    const updated = await prisma.project.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        startDate: startDate !== undefined ? new Date(startDate) : undefined,
        status: status !== undefined ? status : undefined,
        currentTRL: currentTRL !== undefined ? Number(currentTRL) : undefined,
        managerId: managerId !== undefined ? managerId : undefined
      }
    });

    // Record TRL history if updated
    if (isTrlUpgrade) {
      await prisma.tRLHistory.create({
        data: {
          projectId: id,
          trlLevel: Number(currentTRL),
          updatedById: userId!,
          justification: `TRL status modified from Level ${prevTRL} to Level ${currentTRL}.`
        }
      });
    }

    if (isTrlUpgrade) {
      logActivity(userId!, "TRL_UPGRADED", id, null, `Advanced TRL status from Level ${prevTRL} to Level ${currentTRL}`);
    } else {
      logActivity(userId!, "UPDATED_PROJECT", id, null, `Updated project settings`);
    }

    response.status(200).json({ message: "Project updated successfully.", project: updated });
  } catch (error) {
    console.error("Failed to update project:", error);
    response.status(500).json({ message: "Failed to update project." });
  }
}

// Archive/Delete project
export async function archiveProject(request: Request, response: Response) {
  const { id } = request.params;

  try {
    const project = await prisma.project.findUnique({
      where: { id }
    });

    if (!project) {
      response.status(404).json({ message: "Project not found." });
      return;
    }

    await prisma.project.update({
      where: { id },
      data: { status: "ARCHIVED" }
    });

    response.status(200).json({ message: "Project archived successfully." });
  } catch (error) {
    console.error("Failed to archive project:", error);
    response.status(500).json({ message: "Failed to archive project." });
  }
}

// Delete project completely (Admin only)
export async function deleteProject(request: Request, response: Response) {
  const { id } = request.params;
  const role = request.user?.role;

  if (role !== "ADMIN") {
    response.status(403).json({ message: "Only administrators can delete projects." });
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

    await prisma.project.delete({
      where: { id }
    });

    response.status(200).json({ message: "Project deleted successfully." });
  } catch (error) {
    console.error("Failed to delete project:", error);
    response.status(500).json({ message: "Failed to delete project." });
  }
}

// List members
export async function listMembers(request: Request, response: Response) {
  const { id } = request.params;

  try {
    const members = await prisma.projectMember.findMany({
      where: { projectId: id },
      include: { user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } } }
    });

    response.status(200).json({ members: members.map(m => m.user) });
  } catch (error) {
    console.error("Failed to list project members:", error);
    response.status(500).json({ message: "Failed to retrieve project members." });
  }
}

// Assign member
export async function assignMember(request: Request, response: Response) {
  const { id } = request.params;
  const { userId } = request.body;

  if (!userId) {
    response.status(400).json({ message: "UserId is required." });
    return;
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: { manager: true }
    });

    if (!project) {
      response.status(404).json({ message: "Project not found." });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      response.status(404).json({ message: "User not found." });
      return;
    }

    const membership = await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: id, userId } },
      update: {},
      create: { projectId: id, userId }
    });

    // Create database notification
    await createNotification({
      recipientId: user.id,
      title: "Assigned to New Project",
      message: `You have been assigned to project "${project.name}".`,
      type: "PROJECT_ASSIGNMENT",
      link: `/projects/${project.id}`
    });

    response.status(201).json({ message: "Member assigned successfully.", membership });
  } catch (error) {
    console.error("Failed to assign project member:", error);
    response.status(500).json({ message: "Failed to assign project member." });
  }
}

// Remove member
export async function removeMember(request: Request, response: Response) {
  const { id, userId } = request.params;

  try {
    const exists = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId } }
    });

    if (!exists) {
      response.status(404).json({ message: "User is not a member of this project." });
      return;
    }

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId: id, userId } }
    });

    // Notify the removed member
    try {
      const project = await prisma.project.findUnique({ where: { id } });
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (project && user) {
        // Create database notification
        await createNotification({
          recipientId: user.id,
          title: "Removed from Project",
          message: `You have been removed from project "${project.name}".`,
          type: "PROJECT_DEASSIGNMENT",
          link: "/projects"
        });
      }
    } catch (notifErr) {
      console.error("Failed to trigger project de-assignment notifications/emails:", notifErr);
    }

    response.status(200).json({ message: "Member removed from project successfully." });
  } catch (error) {
    console.error("Failed to remove project member:", error);
    response.status(500).json({ message: "Failed to remove project member." });
  }
}

// Retrieve project TRL history
export async function getProjectTrlHistory(request: Request, response: Response) {
  const { id } = request.params;

  try {
    const history = await prisma.tRLHistory.findMany({
      where: { projectId: id },
      orderBy: { recordedAt: "desc" },
      include: { updatedBy: { select: { id: true, name: true } } }
    });

    const formatted = history.map((h: any) => ({
      id: h.id,
      projectId: h.projectId,
      trlLevel: h.trlLevel,
      updatedBy: h.updatedBy.name,
      justification: h.justification,
      recordedAt: h.recordedAt.toISOString().split("T")[0]
    }));

    response.status(200).json({ trlHistory: formatted });
  } catch (error) {
    console.error("Failed to retrieve TRL history:", error);
    response.status(500).json({ message: "Failed to fetch TRL history." });
  }
}

// Update project TRL level directly
export async function updateProjectTrlLevel(request: Request, response: Response) {
  const { id } = request.params;
  const { trlLevel, justification } = request.body;
  const userId = request.user?.userId;

  if (trlLevel === undefined || !justification) {
    response.status(400).json({ message: "TrlLevel and justification are required." });
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

    const prevLevel = project.currentTRL;

    await prisma.$transaction([
      prisma.project.update({
        where: { id },
        data: { currentTRL: Number(trlLevel) }
      }),
      prisma.tRLHistory.create({
        data: {
          projectId: id,
          trlLevel: Number(trlLevel),
          updatedById: userId!,
          justification
        }
      })
    ]);

    // Send notifications to project manager and all members
    try {
      const updater = await prisma.user.findUnique({ where: { id: userId } });
      const updaterName = updater?.name || "System Administrator";

      const notifyUserIds = new Set<string>();
      notifyUserIds.add(project.managerId);

      const members = await prisma.projectMember.findMany({
        where: { projectId: id }
      });
      for (const m of members) {
        notifyUserIds.add(m.userId);
      }

      // Don't notify the updater themselves
      notifyUserIds.delete(userId!);

      for (const targetId of notifyUserIds) {
        const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
        if (!targetUser) continue;

        // Create database notification
        await createNotification({
          recipientId: targetUser.id,
          title: "Project TRL Advanced",
          message: `Project "${project.name}" has been advanced to TRL ${trlLevel} by ${updaterName}.`,
          type: "TRL_PROMOTION",
          link: `/projects/${project.id}`
        });
      }
    } catch (notifErr) {
      console.error("Failed to trigger TRL promotion notifications/emails:", notifErr);
    }

    response.status(200).json({
      message: "TRL status updated successfully.",
      currentTRL: Number(trlLevel)
    });
  } catch (error) {
    console.error("Failed to update TRL level:", error);
    response.status(500).json({ message: "Failed to update Technology Readiness Level." });
  }
}
