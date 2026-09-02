export type UserRole = "OWNER" | "PROJECT_MANAGER" | "TEAM_MEMBER";
export type ProjectStatus = "ACTIVE" | "ARCHIVED" | "COMPLETED";
export type MilestoneStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
export type Priority = "LOW" | "MEDIUM" | "HIGH";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "CANCELLED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  isPending?: boolean;
  notificationEmail?: string;
  phoneNumber?: string;
  location?: string;
  bio?: string;
  skills?: string;
  avatarUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  description: string;
  startDate: string;
  deadline?: string | null;
  status: ProjectStatus;
  progressPercent?: number;
  totalTasks?: number;
  completedTasks?: number;
  totalMilestones?: number;
  totalFiles?: number;
  createdBy: string;
  managerId: string;
  memberIds: string[];
  manager?: User;
  members?: User[];
  milestones?: Milestone[];
  columns?: KanbanColumn[];
  attachments?: Attachment[];
  activityLogs?: ActivityLog[];
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType?: string;
  uploadedById?: string;
  uploadedBy?: { id: string; name: string; email: string };
  projectId?: string;
  cardId?: string;
  createdAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  dueDate: string;
  status: MilestoneStatus;
  completedAt?: string | null;
  notes?: string | null;
}

export interface KanbanColumn {
  id: string;
  projectId: string;
  title: string;
  order: number;
  cards?: KanbanCard[];
}

export interface ChecklistItem {
  id: string;
  cardId: string;
  title: string;
  isCompleted: boolean;
  order: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  cardId: string;
  userId: string;
  content: string;
  createdAt: string;
  user?: { id: string; name: string; avatarUrl?: string };
}

export interface KanbanCard {
  id: string;
  columnId: string;
  projectId: string;
  projectName?: string;
  clientName?: string;
  title: string;
  description?: string | null;
  assigneeId?: string;
  assignee?: User;
  assignees?: User[];
  dueDate?: string | null;
  priority: Priority;
  order: number;
  checklistItems?: ChecklistItem[];
  comments?: Comment[];
  attachments?: Attachment[];
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  projectId?: string | null;
  cardId?: string | null;
  actionType: string;
  details?: string | null;
  createdAt: string;
  user?: { id: string; name: string; avatarUrl?: string };
}

export interface Notification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  isRead: boolean;
  type: string;
  link?: string | null;
  createdAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  projectId?: string | null;
  token: string;
  expiresAt: string;
  status: InvitationStatus;
  invitedById: string;
  invitedBy?: { id: string; name: string; email: string };
  project?: { id: string; name: string; clientName: string };
  createdAt: string;
}
