export type UserRole = "EMPLOYEE" | "MANAGER" | "ADMIN";
export type ProjectStatus = "ACTIVE" | "ARCHIVED" | "COMPLETED";
export type MilestoneStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
export type Priority = "LOW" | "MEDIUM" | "HIGH";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  weeklyTargetHours?: number;
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
  description: string;
  startDate: string;
  status: ProjectStatus;
  currentTRL: number;
  createdBy: string;
  managerId: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType?: string;
  uploadedById: string;
  projectId?: string;
  cardId?: string;
  hourLogId?: string;
  ocrText?: string;
  ocrStatus?: string;
  aiAnalysis?: any;
  metadata?: any;
  createdAt: string;
}

export interface HourLog {
  id: string;
  userId: string;
  projectId: string;
  cardId?: string | null;
  date: string;
  hours: number;
  notes?: string;
  werkpakket?: string;
  startTime?: string | null;
  endTime?: string | null;
  imageUrl?: string;
  attachments?: Attachment[];
  createdAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  dueDate: string;
  status: MilestoneStatus;
  completedAt?: string;
  notes?: string;
}

export interface TRLHistory {
  id: string;
  projectId: string;
  trlLevel: number;
  updatedBy: string;
  justification: string;
  recordedAt: string;
}

export interface KanbanColumn {
  id: string;
  projectId: string;
  title: string;
  order: number;
}

export interface KanbanCard {
  id: string;
  columnId: string;
  projectId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  assignees?: User[];
  dueDate?: string;
  priority: Priority;
  order: number;
  trlLevel?: number;
  attachments?: Attachment[];
  totalLoggedHours?: number;
  createdAt: string;
}
