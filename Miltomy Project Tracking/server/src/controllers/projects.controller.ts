import type { Request, Response } from "express";
import { prisma } from "../services/prisma.js";
import { createNotification } from "../services/notificationService.js";
import { logActivity } from "../services/activityService.js";

// Role-aware project listing
export async function listProjects(request: Request, response: Response) {
  const userId = request.user?.userId || request.user?.id;
  const userRole = request.user?.role;

  try {
    let whereClause: any = {};
    if (userRole === "PROJECT_MANAGER") {
      whereClause = {
        OR: [
          { managerId: userId },
          { createdById: userId },
          { members: { some: { userId } } }
        ]
      };
    } else if (userRole === "TEAM_MEMBER") {
      whereClause = {
        members: { some: { userId } }
      };
    } // OWNER has no whereClause filter (accesses all projects)

    const projects = await prisma.project.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        manager: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } } } },
        columns: {
          include: {
            cards: { select: { id: true } }
          }
        },
        _count: {
          select: {
            cards: true,
            milestones: true,
            attachments: true,
          }
        }
      }
    });

    const formatted = projects.map(p => {
      // Calculate progress based on cards in completed column
      const completedCol = p.columns.find(c => c.title.toLowerCase().includes("completed") || c.title.toLowerCase().includes("done"));
      const completedTasks = completedCol ? completedCol.cards.length : 0;
      const totalTasks = p._count.cards;
      const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        clientName: p.clientName || "Direct Client",
        description: p.description,
        startDate: p.startDate.toISOString().split("T")[0],
        deadline: p.deadline ? p.deadline.toISOString().split("T")[0] : null,
        status: p.status,
        progressPercent,
        totalTasks,
        completedTasks,
        totalMilestones: p._count.milestones,
        totalFiles: p._count.attachments,
        createdBy: p.createdById,
        managerId: p.managerId,
        memberIds: p.members.map(m => m.userId),
        createdAt: p.createdAt.toISOString().split("T")[0],
        updatedAt: p.updatedAt.toISOString().split("T")[0],
        manager: p.manager,
        members: p.members.map(m => m.user)
      };
    });

    response.status(200).json({ projects: formatted });
  } catch (error) {
    console.error("Failed to list projects:", error);
    response.status(500).json({ message: "Failed to list projects." });
  }
}

// Get single project details
export async function getProject(request: Request, response: Response) {
  const { id } = request.params;
  const userId = request.user?.userId || request.user?.id;
  const userRole = request.user?.role;

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } } } },
        milestones: { orderBy: { dueDate: "asc" } },
        attachments: {
          orderBy: { createdAt: "desc" },
          include: { uploadedBy: { select: { id: true, name: true, email: true } } }
        },
        activityLogs: {
          orderBy: { createdAt: "desc" },
          take: 30,
          include: { user: { select: { id: true, name: true, avatarUrl: true } } }
        },
        columns: {
          orderBy: { order: "asc" },
          include: {
            cards: {
              orderBy: { order: "asc" },
              include: {
                assignees: { select: { id: true, name: true, email: true, avatarUrl: true } },
                checklistItems: true,
                comments: {
                  orderBy: { createdAt: "asc" },
                  include: { user: { select: { id: true, name: true, avatarUrl: true } } }
                },
                attachments: true
              }
            }
          }
        }
      }
    });

    if (!project) {
      response.status(404).json({ message: "Project not found." });
      return;
    }

    // Role check
    if (userRole === "PROJECT_MANAGER" && project.managerId !== userId && !project.members.some(m => m.userId === userId) && project.createdById !== userId) {
      response.status(403).json({ message: "You do not have access to this project." });
      return;
    }
    if (userRole === "TEAM_MEMBER" && !project.members.some(m => m.userId === userId)) {
      response.status(403).json({ message: "You do not have access to this project." });
      return;
    }

    // Calculate progress
    let totalTasks = 0;
    let completedTasks = 0;
    project.columns.forEach(col => {
      totalTasks += col.cards.length;
      if (col.title.toLowerCase().includes("completed") || col.title.toLowerCase().includes("done")) {
        completedTasks += col.cards.length;
      }
    });
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const formatted = {
      id: project.id,
      name: project.name,
      clientName: project.clientName || "Direct Client",
      description: project.description,
      startDate: project.startDate.toISOString().split("T")[0],
      deadline: project.deadline ? project.deadline.toISOString().split("T")[0] : null,
      status: project.status,
      progressPercent,
      totalTasks,
      completedTasks,
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
        status: m.status,
        completedAt: m.completedAt ? m.completedAt.toISOString().split("T")[0] : null,
        notes: m.notes
      })),
      columns: project.columns,
      attachments: project.attachments,
      activityLogs: project.activityLogs
    };

    response.status(200).json({ project: formatted });
  } catch (error) {
    console.error("Failed to get project details:", error);
    response.status(500).json({ message: "Failed to fetch project details." });
  }
}

// Create new project (Owner or Project Manager)
export async function createProject(request: Request, response: Response) {
  const { name, clientName, description, startDate, deadline, managerId } = request.body;
  const creatorId = request.user?.userId || request.user?.id;
  const userRole = request.user?.role;

  if (!name || !description) {
    response.status(400).json({ message: "Project name and description are required." });
    return;
  }

  const assignedManagerId = managerId || creatorId;

  try {
    const project = await prisma.project.create({
      data: {
        name,
        clientName: clientName || "Direct Client",
        description,
        startDate: startDate ? new Date(startDate) : new Date(),
        deadline: deadline ? new Date(deadline) : null,
        createdById: creatorId!,
        managerId: assignedManagerId!,
        // Auto create standard Kanban columns: Backlog, To Do, In Progress, Review, Completed
        columns: {
          create: [
            { title: "Backlog", order: 1 },
            { title: "To Do", order: 2 },
            { title: "In Progress", order: 3 },
            { title: "Review", order: 4 },
            { title: "Completed", order: 5 }
          ]
        }
      }
    });

    // Automatically add manager and creator as members
    await prisma.projectMember.createMany({
      data: Array.from(new Set([creatorId!, assignedManagerId!])).map(uid => ({
        projectId: project.id,
        userId: uid
      })),
      skipDuplicates: true
    });

    logActivity(creatorId!, "CREATED_PROJECT", project.id, null, `Created project "${name}" for client "${clientName || 'Direct Client'}"`);

    response.status(201).json({ message: "Project created successfully.", project });
  } catch (error) {
    console.error("Failed to create project:", error);
    response.status(500).json({ message: "Failed to create project." });
  }
}

// Update project
export async function updateProject(request: Request, response: Response) {
  const { id } = request.params;
  const { name, clientName, description, startDate, deadline, status, managerId } = request.body;
  const userId = request.user?.userId || request.user?.id;

  try {
    const project = await prisma.project.findUnique({
      where: { id }
    });

    if (!project) {
      response.status(404).json({ message: "Project not found." });
      return;
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        clientName: clientName !== undefined ? clientName : undefined,
        description: description !== undefined ? description : undefined,
        startDate: startDate !== undefined ? new Date(startDate) : undefined,
        deadline: deadline !== undefined ? (deadline ? new Date(deadline) : null) : undefined,
        status: status !== undefined ? status : undefined,
        managerId: managerId !== undefined ? managerId : undefined
      }
    });

    logActivity(userId!, "UPDATED_PROJECT", id, null, `Updated project settings for "${updated.name}"`);

    response.status(200).json({ message: "Project updated successfully.", project: updated });
  } catch (error) {
    console.error("Failed to update project:", error);
    response.status(500).json({ message: "Failed to update project." });
  }
}

// Archive project
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

// Delete project (Owner only)
export async function deleteProject(request: Request, response: Response) {
  const { id } = request.params;
  const role = request.user?.role;

  if (role !== "OWNER") {
    response.status(403).json({ message: "Only owners can delete projects." });
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
      where: { id }
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

    response.status(200).json({ message: "Member removed from project successfully." });
  } catch (error) {
    console.error("Failed to remove project member:", error);
    response.status(500).json({ message: "Failed to remove project member." });
  }
}
