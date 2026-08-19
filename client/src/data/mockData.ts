import type { HourLog, KanbanCard, KanbanColumn, Milestone, Project, TRLHistory, User } from "../types";

export const users: User[] = [
  {
    id: "user-admin",
    name: "Milton Admin",
    email: "admin@projecttracker.local",
    role: "ADMIN",
    isActive: true,
    createdAt: "2026-06-02",
    weeklyTargetHours: 40
  },
  {
    id: "user-manager",
    name: "Project Manager",
    email: "manager@projecttracker.local",
    role: "MANAGER",
    isActive: true,
    createdAt: "2026-06-02",
    weeklyTargetHours: 40
  },
  {
    id: "user-employee",
    name: "Research Engineer",
    email: "engineer@projecttracker.local",
    role: "EMPLOYEE",
    isActive: true,
    createdAt: "2026-06-02",
    weeklyTargetHours: 40
  }
];

export const currentUser = users[0];

export const projects: Project[] = [
  {
    id: "project-orion",
    name: "Orion Sensor Platform",
    description: "Internal prototype for sensor data collection and readiness tracking.",
    startDate: "2026-05-01",
    status: "ACTIVE",
    currentTRL: 4,
    createdBy: "user-admin",
    managerId: "user-manager",
    memberIds: ["user-manager", "user-employee"],
    createdAt: "2026-05-01",
    updatedAt: "2026-06-02"
  },
  {
    id: "project-harbor",
    name: "Harbor Analytics",
    description: "Dashboard and reporting workflow for internal planning.",
    startDate: "2026-05-20",
    status: "ACTIVE",
    currentTRL: 3,
    createdBy: "user-admin",
    managerId: "user-manager",
    memberIds: ["user-manager"],
    createdAt: "2026-05-20",
    updatedAt: "2026-06-02"
  }
];

export const hourLogs: HourLog[] = [
  {
    id: "hours-1",
    userId: "user-employee",
    projectId: "project-orion",
    date: "2026-06-01",
    hours: 6.5,
    notes: "Prototype review and dashboard notes.",
    createdAt: "2026-06-01"
  }
];

export const milestones: Milestone[] = [
  {
    id: "milestone-1",
    projectId: "project-orion",
    name: "Prototype review",
    dueDate: "2026-06-14",
    status: "IN_PROGRESS"
  }
];

export const trlHistory: TRLHistory[] = [
  {
    id: "trl-1",
    projectId: "project-orion",
    trlLevel: 4,
    updatedBy: "user-manager",
    justification: "Lab validation flow is partially complete. Company TRL wording pending.",
    recordedAt: "2026-06-02"
  }
];

export const kanbanColumns: KanbanColumn[] = [
  { id: "column-todo", projectId: "project-orion", title: "To Do", order: 1 },
  { id: "column-progress", projectId: "project-orion", title: "In Progress", order: 2 },
  { id: "column-review", projectId: "project-orion", title: "In Review", order: 3 },
  { id: "column-done", projectId: "project-orion", title: "Done", order: 4 }
];

export const kanbanCards: KanbanCard[] = [
  {
    id: "card-1",
    columnId: "column-progress",
    projectId: "project-orion",
    title: "Prepare dashboard Figma pass",
    description: "Use mock data until storage is ready.",
    assigneeId: "user-employee",
    dueDate: "2026-06-07",
    priority: "MEDIUM",
    order: 1,
    trlLevel: 2,
    createdAt: "2026-06-02"
  },
  {
    id: "card-2",
    columnId: "column-done",
    projectId: "project-orion",
    title: "Create system requirements plan",
    description: "Document core TRL criteria and deliverables.",
    assigneeId: "user-employee",
    dueDate: "2026-05-10",
    priority: "HIGH",
    order: 2,
    trlLevel: 1,
    createdAt: "2026-05-02"
  },
  {
    id: "card-3",
    columnId: "column-done",
    projectId: "project-orion",
    title: "Verify basic principles of sensor mesh",
    description: "Theoretical validation and paper citations.",
    assigneeId: "user-manager",
    dueDate: "2026-05-15",
    priority: "LOW",
    order: 3,
    trlLevel: 1,
    createdAt: "2026-05-05"
  },
  {
    id: "card-4",
    columnId: "column-progress",
    projectId: "project-orion",
    title: "Set up client project sandbox",
    description: "Ensure packages compile and dev server runs.",
    assigneeId: "user-employee",
    dueDate: "2026-06-15",
    priority: "MEDIUM",
    order: 4,
    trlLevel: 3,
    createdAt: "2026-06-02"
  },
  {
    id: "card-5",
    columnId: "column-todo",
    projectId: "project-orion",
    title: "Configure API database schema",
    description: "Setup tables and express routes.",
    assigneeId: "user-manager",
    dueDate: "2026-06-25",
    priority: "HIGH",
    order: 5,
    trlLevel: 4,
    createdAt: "2026-06-02"
  }
];
