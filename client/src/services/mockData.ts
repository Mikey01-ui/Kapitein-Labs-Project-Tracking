import type { User, Project, HourLog, Milestone, KanbanColumn, KanbanCard, Attachment } from "../types";

export interface Expense {
  id: string;
  userId: string;
  projectId?: string;
  amount: number;
  currency: string;
  merchant: string;
  date: string;
  category: string;
  notes?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  project?: {
    name: string;
  };
  approvedBy?: {
    name: string;
  };
  attachments: Attachment[];
}

export const mockUsers: User[] = [
  {
    id: "demo-user-milton",
    name: "Milton Employee (Demo)",
    email: "miltomy01@gmail.com",
    role: "EMPLOYEE",
    isActive: true,
    weeklyTargetHours: 40,
    createdAt: "2026-01-01T00:00:00.000Z",
    location: "Amsterdam, NL",
    bio: "Research & Development Engineer focused on homelab prototyping and custom web platforms."
  },
  {
    id: "demo-user-piet",
    name: "Piet Hein",
    email: "p.hein@projecttracker.local",
    role: "MANAGER",
    isActive: true,
    createdAt: "2025-09-15T00:00:00.000Z"
  },
  {
    id: "demo-user-lisa",
    name: "Lisa van der Berg",
    email: "l.vanderberg@projecttracker.local",
    role: "EMPLOYEE",
    isActive: true,
    createdAt: "2026-02-10T00:00:00.000Z"
  }
];

export const mockProjects: Project[] = [
  {
    id: "demo-proj-1",
    name: "Project Tracker Dashboard",
    description: "Central command portal for managing research tasks, logging engineering hours, and visualising system architectures.",
    startDate: "2026-05-01T00:00:00.000Z",
    status: "ACTIVE",
    currentTRL: 7,
    createdBy: "demo-user-piet",
    managerId: "demo-user-piet",
    memberIds: ["demo-user-milton", "demo-user-lisa"],
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-07-22T00:00:00.000Z"
  },
  {
    id: "demo-proj-2",
    name: "PaperHedge Project",
    description: "Decentralised document backup and offline-first documentation archive using local storage synchronization.",
    startDate: "2026-06-15T00:00:00.000Z",
    status: "ACTIVE",
    currentTRL: 2,
    createdBy: "demo-user-piet",
    managerId: "demo-user-piet",
    memberIds: ["demo-user-milton"],
    createdAt: "2026-06-15T00:00:00.000Z",
    updatedAt: "2026-07-22T00:00:00.000Z"
  },
  {
    id: "demo-proj-3",
    name: "RAG Patent Prior-Art Tool",
    description: "Retrieval-Augmented Generation pipeline to crawl and cross-reference patent database archives against project spec drafts.",
    startDate: "2026-07-01T00:00:00.000Z",
    status: "ACTIVE",
    currentTRL: 5,
    createdBy: "demo-user-piet",
    managerId: "demo-user-piet",
    memberIds: ["demo-user-milton", "demo-user-lisa"],
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-22T00:00:00.000Z"
  }
];

export const mockMilestones: Milestone[] = [
  {
    id: "demo-ms-1",
    projectId: "demo-proj-1",
    name: "Frontend Boilerplate Setup",
    dueDate: "2026-05-15T00:00:00.000Z",
    status: "COMPLETED",
    completedAt: "2026-05-14T00:00:00.000Z"
  },
  {
    id: "demo-ms-2",
    projectId: "demo-proj-1",
    name: "Prisma Database Schema Migration",
    dueDate: "2026-06-01T00:00:00.000Z",
    status: "COMPLETED",
    completedAt: "2026-05-30T00:00:00.000Z"
  },
  {
    id: "demo-ms-3",
    projectId: "demo-proj-1",
    name: "Integrate Background OCR AI Scan",
    dueDate: "2026-07-15T00:00:00.000Z",
    status: "COMPLETED",
    completedAt: "2026-07-10T00:00:00.000Z"
  },
  {
    id: "demo-ms-4",
    projectId: "demo-proj-1",
    name: "Production Beta Deploy",
    dueDate: "2026-07-30T00:00:00.000Z",
    status: "IN_PROGRESS"
  },
  {
    id: "demo-ms-5",
    projectId: "demo-proj-2",
    name: "Architecture & Spec Review",
    dueDate: "2026-07-10T00:00:00.000Z",
    status: "COMPLETED",
    completedAt: "2026-07-08T00:00:00.000Z"
  },
  {
    id: "demo-ms-6",
    projectId: "demo-proj-2",
    name: "P2P Sync Service Integration",
    dueDate: "2026-08-15T00:00:00.000Z",
    status: "PENDING"
  },
  {
    id: "demo-ms-7",
    projectId: "demo-proj-3",
    name: "Embeddings Generator Pipeline",
    dueDate: "2026-07-20T00:00:00.000Z",
    status: "COMPLETED",
    completedAt: "2026-07-19T00:00:00.000Z"
  },
  {
    id: "demo-ms-8",
    projectId: "demo-proj-3",
    name: "Cross-Reference Audit Interface",
    dueDate: "2026-08-05T00:00:00.000Z",
    status: "IN_PROGRESS"
  }
];

export const mockHourLogs: HourLog[] = [
  {
    id: "demo-hl-1",
    userId: "demo-user-milton",
    projectId: "demo-proj-1",
    cardId: "demo-card-1",
    date: "2026-07-20T00:00:00.000Z",
    hours: 6.5,
    notes: "Designed and implemented TypeScript OCR background worker interface.",
    werkpakket: "WP3 - AI Core Integration",
    createdAt: "2026-07-20T18:30:00.000Z"
  },
  {
    id: "demo-hl-2",
    userId: "demo-user-milton",
    projectId: "demo-proj-1",
    cardId: "demo-card-2",
    date: "2026-07-21T00:00:00.000Z",
    hours: 8,
    notes: "Debugged optional chaining rendering crashes for newly submitted assets.",
    werkpakket: "WP2 - Client Portal",
    createdAt: "2026-07-21T19:00:00.000Z"
  },
  {
    id: "demo-hl-3",
    userId: "demo-user-milton",
    projectId: "demo-proj-2",
    cardId: "demo-card-3",
    date: "2026-07-22T00:00:00.000Z",
    hours: 4.5,
    notes: "Wrote core architecture spec documents for local-first sqlite sync engine.",
    werkpakket: "WP1 - Research & Design",
    createdAt: "2026-07-22T14:15:00.000Z"
  },
  {
    id: "demo-hl-4",
    userId: "demo-user-lisa",
    projectId: "demo-proj-3",
    date: "2026-07-21T00:00:00.000Z",
    hours: 7.5,
    notes: "Indexed 15,000 patent documents into pgvector backend store.",
    werkpakket: "WP2 - Vector Engine Development",
    createdAt: "2026-07-21T17:30:00.000Z"
  }
];

export const mockKanbanColumns = (projectId: string): KanbanColumn[] => [
  { id: `${projectId}-col-todo`, projectId, title: "To Do", order: 1 },
  { id: `${projectId}-col-progress`, projectId, title: "In Progress", order: 2 },
  { id: `${projectId}-col-review`, projectId, title: "Review", order: 3 },
  { id: `${projectId}-col-done`, projectId, title: "Completed", order: 4 }
];

export const mockKanbanCards = (projectId: string): KanbanCard[] => {
  if (projectId === "demo-proj-1") {
    return [
      {
        id: "demo-card-1",
        columnId: `${projectId}-col-done`,
        projectId,
        title: "Integrate Background OCR AI Scan",
        description: "Configure background OCR text extraction and automated auditing layout.",
        assigneeId: "demo-user-milton",
        assignees: [mockUsers[0]],
        dueDate: "2026-07-15T00:00:00.000Z",
        priority: "HIGH",
        order: 1,
        trlLevel: 7,
        totalLoggedHours: 12.5,
        createdAt: "2026-07-01T00:00:00.000Z"
      },
      {
        id: "demo-card-2",
        columnId: `${projectId}-col-progress`,
        projectId,
        title: "Fix frontend optional chaining crash",
        description: "Add defensive guards to render loops when displaying attachments without completed scans.",
        assigneeId: "demo-user-milton",
        assignees: [mockUsers[0]],
        dueDate: "2026-07-25T00:00:00.000Z",
        priority: "MEDIUM",
        order: 1,
        trlLevel: 6,
        totalLoggedHours: 8,
        createdAt: "2026-07-20T00:00:00.000Z"
      },
      {
        id: "demo-card-3",
        columnId: `${projectId}-col-todo`,
        projectId,
        title: "Setup E2E testing framework",
        description: "Write automated Playwright scripts to verify login and expense submission processes.",
        priority: "LOW",
        order: 1,
        trlLevel: 5,
        createdAt: "2026-07-21T00:00:00.000Z"
      }
    ];
  }
  
  return [
    {
      id: `${projectId}-card-default`,
      columnId: `${projectId}-col-todo`,
      projectId,
      title: "Initial Setup and Spec Audit",
      description: "Define core modules and set engineering tracks milestones.",
      assigneeId: "demo-user-milton",
      assignees: [mockUsers[0]],
      priority: "HIGH",
      order: 1,
      trlLevel: 1,
      createdAt: "2026-07-01T00:00:00.000Z"
    }
  ];
};

export const mockExpenses: Expense[] = [
  {
    id: "demo-exp-1",
    userId: "demo-user-milton",
    projectId: "demo-proj-1",
    amount: 29.00,
    currency: "EUR",
    merchant: "Vercel Inc.",
    date: "2026-07-22T00:00:00.000Z",
    category: "Software & Subscriptions",
    notes: "Hosting premium cloud deployment for review testing.",
    status: "APPROVED",
    createdAt: "2026-07-22T10:15:00.000Z",
    user: { name: "Milton Employee (Demo)", email: "miltomy01@gmail.com" },
    project: { name: "Project Tracker Dashboard" },
    approvedBy: { name: "Piet Hein" },
    attachments: [
      {
        id: "demo-att-1",
        name: "vercel_invoice_july_2026.png",
        url: "/uploads/test-verification-receipt.png",
        size: 42100,
        mimeType: "image/png",
        uploadedById: "demo-user-milton",
        ocrStatus: "COMPLETED",
        ocrText: "VERCEL INC.\nInvoice ID: INV-2026-088\nAmount: EUR 29.00\nDate: 2026-07-22",
        aiAnalysis: {
          tags: ["Hosting", "Subscriptions", "Invoice"],
          auditNotes: "Audit Clean. Matches expense request and category exactly.",
          confidence: 0.99,
          detectedTools: ["Vercel CLI", "Billing Portal"],
          classification: "Invoice / Receipt",
          verificationStatus: "SUCCESS"
        },
        createdAt: "2026-07-22T10:15:00.000Z"
      }
    ]
  },
  {
    id: "demo-exp-2",
    userId: "demo-user-milton",
    projectId: "demo-proj-2",
    amount: 145.50,
    currency: "EUR",
    merchant: "Gamma Hardware Store",
    date: "2026-07-20T00:00:00.000Z",
    category: "Hardware & Tools",
    notes: "Backup drive modules for offline storage sync tests.",
    status: "PENDING",
    createdAt: "2026-07-20T12:00:00.000Z",
    user: { name: "Milton Employee (Demo)", email: "miltomy01@gmail.com" },
    project: { name: "PaperHedge Project" },
    attachments: [
      {
        id: "demo-att-2",
        name: "gamma_hardware_receipt.png",
        url: "/uploads/test-verification-receipt.png",
        size: 154300,
        mimeType: "image/png",
        uploadedById: "demo-user-milton",
        ocrStatus: "COMPLETED",
        ocrText: "GAMMA HARDWARE STORE\nRotterdam, NL\nDate: 2026-07-20\nTotal: EUR 145.50",
        aiAnalysis: {
          tags: ["Hardware", "Prototyping", "Offline Storage"],
          auditNotes: "Audit Warning: Image uploaded without descriptive log notes. Unable to run task description correlation.",
          confidence: 0.98,
          detectedTools: ["POS Register", "Receipt Scanner"],
          classification: "Invoice / Receipt",
          verificationStatus: "WARNING"
        },
        createdAt: "2026-07-20T12:00:00.000Z"
      }
    ]
  }
];

export const mockActivities = [
  {
    id: "act-1",
    type: "hour_log",
    message: "Milton Employee logged 4.5 hours on PaperHedge Project",
    timestamp: "2 hours ago"
  },
  {
    id: "act-2",
    type: "expense",
    message: "Vercel Inc. expense request was APPROVED by Piet Hein",
    timestamp: "3 hours ago"
  },
  {
    id: "act-3",
    type: "milestone",
    message: "Milestone 'Integrate Background OCR AI Scan' marked completed",
    timestamp: "1 day ago"
  }
];

export const mockNotifications = [
  {
    id: "notif-1",
    title: "Expense Request Approved",
    message: "Your Vercel Inc. subscription expense of €29.00 was approved by Piet Hein.",
    createdAt: new Date().toISOString(),
    isRead: false
  }
];
