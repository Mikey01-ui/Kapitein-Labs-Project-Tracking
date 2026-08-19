import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../services/prisma.js";
import { analyzeAttachment } from "../services/imageAnalyzer.js";
import { logActivity } from "../services/activityService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    // Content is expected to be a base64 data URL: e.g. "data:image/png;base64,iVBORw0..."
    const matches = content.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      res.status(400).json({ message: "Invalid base64 image content format." });
      return;
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    // Ensure uploads directory exists (in server/uploads/)
    const uploadsDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileExt = path.extname(filename) || ".png";
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${fileExt}`;
    const filePath = path.join(uploadsDir, uniqueFilename);

    await fs.promises.writeFile(filePath, buffer);

    const fileUrl = `/uploads/${uniqueFilename}`;

    // If cardId is provided, also create an Attachment record in the database
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

    // If hourLogId is provided, also create an Attachment record in the database
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

    // If expenseId is provided, also create an Attachment record in the database
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
