import type { User, Project, Milestone, KanbanColumn, KanbanCard, Attachment } from "../types";

export const mockUsers: User[] = [
  {
    id: "demo-user-milton",
    name: "Milton (Agency Owner)",
    email: "owner@miltomy.com",
    role: "OWNER",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    location: "Amsterdam, NL",
    bio: "Agency Director and Lead Product Strategist at Miltomy."
  },
  {
    id: "demo-user-piet",
    name: "Sarah Jenkins",
    email: "sarah@miltomy.com",
    role: "PROJECT_MANAGER",
    isActive: true,
    createdAt: "2025-09-15T00:00:00.000Z"
  },
  {
    id: "demo-user-lisa",
    name: "Alex Rivera",
    email: "alex@miltomy.com",
    role: "TEAM_MEMBER",
    isActive: true,
    createdAt: "2026-02-10T00:00:00.000Z"
  }
];

export const mockProjects: Project[] = [
  {
    id: "demo-proj-1",
    name: "E-Commerce Replatform & Headless UX",
    clientName: "Luminary Wear",
    description: "Full brand overhaul, high-conversion headless design system, and custom CMS.",
    startDate: "2026-05-01T00:00:00.000Z",
    deadline: "2026-08-30T00:00:00.000Z",
    status: "ACTIVE",
    progressPercent: 70,
    totalTasks: 10,
    completedTasks: 7,
    createdBy: "demo-user-milton",
    managerId: "demo-user-piet",
    memberIds: ["demo-user-milton", "demo-user-lisa"],
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-07-22T00:00:00.000Z"
  },
  {
    id: "demo-proj-2",
    name: "Fintech Dashboard & Client Portal",
    clientName: "Nexus Capital",
    description: "Secure investor analytics, asset tracking, and custom transaction reporting.",
    startDate: "2026-06-15T00:00:00.000Z",
    deadline: "2026-09-15T00:00:00.000Z",
    status: "ACTIVE",
    progressPercent: 35,
    totalTasks: 8,
    completedTasks: 3,
    createdBy: "demo-user-milton",
    managerId: "demo-user-piet",
    memberIds: ["demo-user-milton"],
    createdAt: "2026-06-15T00:00:00.000Z",
    updatedAt: "2026-07-22T00:00:00.000Z"
  }
];

export const mockMilestones: Milestone[] = [
  {
    id: "demo-ms-1",
    projectId: "demo-proj-1",
    name: "Design System & Wireframes Approval",
    dueDate: "2026-06-01T00:00:00.000Z",
    status: "COMPLETED"
  },
  {
    id: "demo-ms-2",
    projectId: "demo-proj-1",
    name: "Front-End Integration & CMS Delivery",
    dueDate: "2026-07-15T00:00:00.000Z",
    status: "IN_PROGRESS"
  }
];

export const mockKanbanColumns: KanbanColumn[] = [
  { id: "col-backlog", projectId: "demo-proj-1", title: "Backlog", order: 1 },
  { id: "col-todo", projectId: "demo-proj-1", title: "To Do", order: 2 },
  { id: "col-progress", projectId: "demo-proj-1", title: "In Progress", order: 3 },
  { id: "col-review", projectId: "demo-proj-1", title: "Review", order: 4 },
  { id: "col-done", projectId: "demo-proj-1", title: "Completed", order: 5 }
];

export const mockKanbanCards: KanbanCard[] = [
  {
    id: "demo-card-1",
    columnId: "col-progress",
    projectId: "demo-proj-1",
    title: "Design Responsive Navigation & Dark Hero Header",
    description: "Prepare Figma tokens and interactive CSS micro-animations.",
    assigneeId: "demo-user-milton",
    priority: "HIGH",
    order: 1,
    dueDate: "2026-07-25T00:00:00.000Z",
    createdAt: "2026-07-01T00:00:00.000Z"
  },
  {
    id: "demo-card-2",
    columnId: "col-done",
    projectId: "demo-proj-1",
    title: "Initial Scope Discovery and Brand Blueprint",
    description: "Align client milestones with agency team deliverables.",
    assigneeId: "demo-user-piet",
    priority: "MEDIUM",
    order: 2,
    dueDate: "2026-05-15T00:00:00.000Z",
    createdAt: "2026-05-01T00:00:00.000Z"
  }
];

export const mockAttachments: Attachment[] = [
  {
    id: "demo-att-1",
    name: "Design_Specifications_v2.pdf",
    url: "/uploads/design_spec.pdf",
    size: 2450000,
    mimeType: "application/pdf",
    projectId: "demo-proj-1",
    uploadedBy: {
      id: "demo-user-milton",
      name: "Milton (Agency Owner)",
      email: "owner@miltomy.com"
    },
    createdAt: "2026-07-10T12:00:00.000Z"
  }
];
