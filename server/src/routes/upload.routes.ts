import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { prisma } from "../services/prisma.js";
import { analyzeAttachment } from "../services/imageAnalyzer.js";
import { logActivity } from "../services/activityService.js";
import { storeUpload } from "../services/storage.js";

export const uploadRouter = Router();

uploadRouter.post("/", requireAuth, async (req, res) => {
  const { filename, content, cardId, hourLogId, expenseId } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (!filename || !content) {
    res.status(400).json({ message: "Filename and content are required." });
    return;
  }

  try {
    const matches = content.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      res.status(400).json({ message: "Invalid base64 image content format." });
      return;
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");
    const stored = await storeUpload(buffer, filename, mimeType);
    const fileUrl = stored.url;

    if (cardId) {
      const card = await prisma.kanbanCard.findUnique({
        where: { id: cardId }
      });
      if (card) {
        const attachment = await prisma.attachment.create({
          data: {
            name: filename,
            url: fileUrl,
            size: buffer.length,
            mimeType,
            uploadedById: userId,
            projectId: card.projectId,
            cardId: cardId
          }
        });
        analyzeAttachment(attachment.id);
        logActivity(userId, "ADDED_ATTACHMENT", card.projectId, cardId, `Attached "${filename}" to task "${card.title}"`);
      }
    }

    if (hourLogId) {
      const hourLog = await prisma.hourLog.findUnique({
        where: { id: hourLogId }
      });
      if (hourLog) {
        const attachment = await prisma.attachment.create({
          data: {
            name: filename,
            url: fileUrl,
            size: buffer.length,
            mimeType,
            uploadedById: userId,
            projectId: hourLog.projectId,
            hourLogId: hourLogId
          }
        });
        analyzeAttachment(attachment.id);
        logActivity(userId, "ADDED_PROOF", hourLog.projectId, null, `Attached proof image to hour log`);
      }
    }

    if (expenseId) {
      const expense = await prisma.expense.findUnique({
        where: { id: expenseId }
      });
      if (expense) {
        const attachment = await prisma.attachment.create({
          data: {
            name: filename,
            url: fileUrl,
            size: buffer.length,
            mimeType,
            uploadedById: userId,
            projectId: expense.projectId || null,
            expenseId: expenseId
          }
        });
        analyzeAttachment(attachment.id);
        logActivity(userId, "ADDED_RECEIPT", expense.projectId || null, null, `Attached receipt/invoice to expense log`);
      }
    }

    res.status(200).json({ url: fileUrl });
  } catch (error) {
    console.error("Failed to upload image:", error);
    res.status(500).json({ message: "Failed to upload image." });
  }
});
