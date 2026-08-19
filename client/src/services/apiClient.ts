import * as mock from "./mockData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const isDemo = localStorage.getItem("kapetein_demo_mode") === "true" || window.location.search.includes("preview=true") || window.location.hash.includes("preview=true");

  if (isDemo) {
    if (window.location.search.includes("preview=true")) {
      localStorage.setItem("kapetein_demo_mode", "true");
    }

    const cleanPath = path.split("?")[0];
    await new Promise(resolve => setTimeout(resolve, 200));

    if (cleanPath === "/auth/login") {
      return {
        token: "mock-demo-token-12345",
        user: mock.mockUsers[0]
      } as unknown as T;
    }

    if (cleanPath === "/auth/me") {
      return {
        user: mock.mockUsers[0]
      } as unknown as T;
    }

    if (cleanPath === "/projects") {
      return { projects: mock.mockProjects } as unknown as T;
    }

    if (cleanPath.startsWith("/projects/") && cleanPath.endsWith("/milestones")) {
      const parts = cleanPath.split("/");
      const projId = parts[2];
      const milestones = mock.mockMilestones.filter(m => m.projectId === projId);
      return { milestones } as unknown as T;
    }

    if (cleanPath.startsWith("/projects/") && cleanPath.endsWith("/kanban")) {
      const parts = cleanPath.split("/");
      const projId = parts[2];
      const columns = mock.mockKanbanColumns(projId);
      const cards = mock.mockKanbanCards(projId);
      const formattedColumns = columns.map(col => ({
        ...col,
        cards: cards.filter(c => c.columnId === col.id)
      }));
      return { columns: formattedColumns } as unknown as T;
    }

    if (cleanPath === "/hours") {
      if (options?.method === "POST") {
        const body = JSON.parse(options.body as string);
        return {
          log: {
            id: `demo-hl-${Date.now()}`,
            userId: "demo-user-milton",
            projectId: body.projectId,
            cardId: body.cardId,
            date: body.date,
            hours: Number(body.hours),
            notes: body.notes,
            werkpakket: body.werkpakket,
            createdAt: new Date().toISOString()
          }
        } as unknown as T;
      }
      return { logs: mock.mockHourLogs } as unknown as T;
    }

    if (cleanPath.startsWith("/hours/project/")) {
      const parts = cleanPath.split("/");
      const projId = parts[3];
      const logs = mock.mockHourLogs.filter(l => l.projectId === projId);
      return { logs } as unknown as T;
    }

    if (cleanPath.startsWith("/hours/card/")) {
      const parts = cleanPath.split("/");
      const cardId = parts[3];
      const logs = mock.mockHourLogs.filter(l => l.cardId === cardId);
      return { logs } as unknown as T;
    }

    if (cleanPath === "/expenses") {
      if (options?.method === "POST") {
        const body = JSON.parse(options.body as string);
        return {
          expense: {
            id: `demo-exp-${Date.now()}`,
            userId: "demo-user-milton",
            projectId: body.projectId,
            amount: Number(body.amount),
            currency: body.currency,
            merchant: body.merchant,
            date: body.date,
            category: body.category,
            notes: body.notes,
            status: "PENDING",
            createdAt: new Date().toISOString(),
            user: { name: "Milton Employee (Demo)", email: "miltomy01@gmail.com" },
            project: { name: mock.mockProjects.find(p => p.id === body.projectId)?.name || "Default Project" },
            attachments: body.attachmentUrl ? [
              {
                id: `demo-att-${Date.now()}`,
                name: "uploaded_receipt.png",
                url: body.attachmentUrl,
                size: 24500,
                ocrStatus: "COMPLETED",
                ocrText: `MERCHANT: ${body.merchant}\nAMOUNT: ${body.amount}\nDATE: ${body.date}`,
                aiAnalysis: {
                  tags: [body.category],
                  auditNotes: "Audit Clean. Matches expense request.",
                  confidence: 0.99,
                  classification: "Invoice / Receipt",
                  verificationStatus: "SUCCESS"
                },
                createdAt: new Date().toISOString()
              }
            ] : []
          }
        } as unknown as T;
      }
      return { expenses: mock.mockExpenses } as unknown as T;
    }

    if (cleanPath === "/reports/project-status") {
      return { report: [] } as unknown as T;
    }

    if (cleanPath === "/activities") {
      return { activities: mock.mockActivities } as unknown as T;
    }

    if (cleanPath === "/users") {
      return { users: mock.mockUsers } as unknown as T;
    }

    if (cleanPath === "/notifications") {
      return { notifications: mock.mockNotifications } as unknown as T;
    }

    if (cleanPath === "/upload") {
      return { url: "/uploads/test-verification-receipt.png" } as unknown as T;
    }
  }

  const token = localStorage.getItem("kapetein_token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options?.headers
  };

  if (token) {
    (headers as any)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

