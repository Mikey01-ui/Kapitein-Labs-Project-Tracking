import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { prisma } from "../services/prisma.js";
import { handleChatTurn, generateProjectPlan } from "../services/aiOnboardingService.js";
import { logActivity } from "../services/activityService.js";
import { createNotification } from "../services/notificationService.js";

export const aiOnboardingRouter = Router();
aiOnboardingRouter.use(requireAuth);

// 1. Chatbot turn endpoint
aiOnboardingRouter.post("/chat", async (req, res) => {
  const { messages, files } = req.body;

  if (!Array.isArray(messages)) {
    res.status(400).json({ message: "Messages array is required." });
    return;
  }

  try {
    const fileList = Array.isArray(files) ? files : [];
    const result = await handleChatTurn(messages, fileList);
    res.status(200).json(result);
  } catch (error) {
    console.error("AI Onboarding Chat Error:", error);
    res.status(500).json({ message: "Failed to process chat turn." });
  }
});

// 2. Generate project structure template endpoint
aiOnboardingRouter.post("/generate-plan", async (req, res) => {
  const { name, description, targetTrl, chatHistory, files } = req.body;

  try {
    const history = Array.isArray(chatHistory) ? chatHistory : [];
    const fileList = Array.isArray(files) ? files : [];
    const result = await generateProjectPlan(name || "", description || "", targetTrl || 4, history, fileList);
    res.status(200).json(result);
  } catch (error) {
    console.error("AI Plan Generation Error:", error);
    res.status(500).json({ message: "Failed to generate project plan." });
  }
});

// 3. Single-transaction project creation & population endpoint
aiOnboardingRouter.post("/create-project", async (req, res) => {
  const { name, description, startDate, managerId, currentTRL, targetTRL, milestones, cards } = req.body;
  const creatorId = req.user?.userId;

  if (!name || !description || !startDate || !managerId) {
    res.status(400).json({ message: "Name, description, startDate, and managerId are required." });
    return;
  }

  if (!creatorId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const startDateTime = new Date(startDate);
    const startTrlNum = currentTRL ? Number(currentTRL) : 1;

    // Run in a single transaction
    const project = await prisma.$transaction(async (tx) => {
      // 1. Create the project with default Kanban columns
      const proj = await tx.project.create({
        data: {
          name,
          description,
          startDate: startDateTime,
          currentTRL: startTrlNum,
          createdById: creatorId,
          managerId,
          columns: {
            create: [
              { title: "To Do", order: 1, id: `col-todo-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}` },
              { title: "In Progress", order: 2, id: `col-progress-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}` },
              { title: "In Review", order: 3, id: `col-review-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}` },
              { title: "Completed", order: 4, id: `col-done-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}` }
            ]
          }
        },
        include: {
          columns: true
        }
      });

      // 2. Map column types to created columns IDs
      const colMap: Record<string, string> = {};
      proj.columns.forEach(col => {
        const title = col.title.toLowerCase();
        if (title.includes("todo") || title.includes("to do")) colMap["todo"] = col.id;
        else if (title.includes("progress")) colMap["progress"] = col.id;
        else if (title.includes("review")) colMap["review"] = col.id;
        else if (title.includes("done") || title.includes("completed")) colMap["done"] = col.id;
      });

      // Fallbacks
      const defaultColId = proj.columns[0].id;

      // 3. Create milestones with calculated dates
      if (Array.isArray(milestones) && milestones.length > 0) {
        await tx.milestone.createMany({
          data: milestones.map(m => {
            const dueDate = new Date(startDateTime);
            const offset = typeof m.dueDateOffsetDays === "number" ? m.dueDateOffsetDays : parseInt(m.dueDateOffsetDays, 10);
            dueDate.setDate(dueDate.getDate() + (isNaN(offset) ? 14 : offset));
            return {
              projectId: proj.id,
              name: m.name,
              dueDate,
              notes: m.notes || null
            };
          })
        });
      }

      // 4. Create Kanban cards
      if (Array.isArray(cards) && cards.length > 0) {
        await tx.kanbanCard.createMany({
          data: cards.map(c => {
            const mappedColId = colMap[c.columnType] || defaultColId;
            
            // Map priority safely to LOW | MEDIUM | HIGH
            let cardPriority: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM";
            if (c.priority) {
              const pUpper = String(c.priority).toUpperCase();
              if (pUpper === "LOW") {
                cardPriority = "LOW";
              } else if (pUpper === "HIGH" || pUpper === "URGENT" || pUpper === "CRITICAL") {
                cardPriority = "HIGH";
              }
            }

            const trlVal = c.trlLevel ? Number(c.trlLevel) : null;
            const validTrl = (trlVal !== null && !isNaN(trlVal)) ? trlVal : null;

            return {
              projectId: proj.id,
              columnId: mappedColId,
              title: c.title,
              description: c.description || null,
              priority: cardPriority,
              order: c.order ? Number(c.order) : 1,
              trlLevel: validTrl
            };
          })
        });
      }

      // 5. Add creator and manager as project members
      await tx.projectMember.createMany({
        data: Array.from(new Set([creatorId, managerId])).map(uid => ({
          projectId: proj.id,
          userId: uid
        })),
        skipDuplicates: true
      });

      return proj;
    });

    logActivity(creatorId, "CREATED_PROJECT", project.id, null, `Created project "${name}" via AI Onboarding`);

    // Notify manager
    if (managerId !== creatorId) {
      await createNotification({
        recipientId: managerId,
        title: "Assigned as Project Lead",
        message: `You have been assigned as Project Lead for "${name}" created via AI Onboarding.`,
        type: "PROJECT_ASSIGNMENT",
        link: `/projects/${project.id}`
      }).catch(err => console.error("Failed to notify manager:", err));
    }

    res.status(201).json({ message: "Project created successfully via AI Onboarding.", project });
  } catch (error) {
    console.error("AI Project Creation Error:", error);
    res.status(500).json({ message: "Failed to create project and populate boards." });
  }
});
