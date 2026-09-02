import type { KanbanCard, KanbanColumn, Milestone, Project, User } from "../types";

export const users: User[] = [
  {
    id: "user-owner",
    name: "Milton (Agency Owner)",
    email: "owner@miltomy.com",
    role: "OWNER",
    isActive: true,
    createdAt: "2026-06-02",
  },
  {
    id: "user-manager",
    name: "Sarah (Project Manager)",
    email: "sarah@miltomy.com",
    role: "PROJECT_MANAGER",
    isActive: true,
    createdAt: "2026-06-02",
  },
  {
    id: "user-employee",
    name: "Alex (Team Member)",
    email: "alex@miltomy.com",
    role: "TEAM_MEMBER",
    isActive: true,
    createdAt: "2026-06-02",
  }
];

export const currentUser = users[0];

export const projects: Project[] = [
  {
    id: "project-orion",
    name: "E-Commerce Brand Redesign",
    clientName: "Luminary Wear",
    description: "Full brand refresh, Shopify headless storefront, and marketing funnel setup.",
    startDate: "2026-05-01",
    deadline: "2026-08-30",
    status: "ACTIVE",
    progressPercent: 65,
    totalTasks: 12,
    completedTasks: 8,
    createdBy: "user-owner",
    managerId: "user-manager",
    memberIds: ["user-manager", "user-employee"],
    createdAt: "2026-05-01",
    updatedAt: "2026-06-02"
  },
  {
    id: "project-harbor",
    name: "Mobile App MVP & Portal",
    clientName: "Nexus Fintech",
    description: "React Native client portal and onboarding application.",
    startDate: "2026-05-20",
    deadline: "2026-09-15",
    status: "ACTIVE",
    progressPercent: 40,
    totalTasks: 10,
    completedTasks: 4,
    createdBy: "user-owner",
    managerId: "user-manager",
    memberIds: ["user-manager"],
    createdAt: "2026-05-20",
    updatedAt: "2026-06-02"
  }
];

export const milestones: Milestone[] = [
  {
    id: "milestone-1",
    projectId: "project-orion",
    name: "UI / UX Deliverable Approval",
    dueDate: "2026-06-14",
    status: "IN_PROGRESS"
  }
];

export const kanbanColumns: KanbanColumn[] = [
  { id: "column-backlog", projectId: "project-orion", title: "Backlog", order: 1 },
  { id: "column-todo", projectId: "project-orion", title: "To Do", order: 2 },
  { id: "column-progress", projectId: "project-orion", title: "In Progress", order: 3 },
  { id: "column-review", projectId: "project-orion", title: "Review", order: 4 },
  { id: "column-done", projectId: "project-orion", title: "Completed", order: 5 }
];

export const kanbanCards: KanbanCard[] = [
  {
    id: "card-1",
    columnId: "column-progress",
    projectId: "project-orion",
    title: "Design Homepage Hero & Navigation",
    description: "Use Figma layout system for dark theme assets.",
    assigneeId: "user-employee",
    dueDate: "2026-06-07",
    priority: "MEDIUM",
    order: 1,
    createdAt: "2026-06-02"
  },
  {
    id: "card-2",
    columnId: "column-done",
    projectId: "project-orion",
    title: "Client Onboarding & Project Scope Sign-off",
    description: "Align deliverables and milestone targets.",
    assigneeId: "user-manager",
    dueDate: "2026-05-10",
    priority: "HIGH",
    order: 2,
    createdAt: "2026-05-02"
  }
];
