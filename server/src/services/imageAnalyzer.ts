import { prisma } from "./prisma.js";

interface AIAnalysisResult {
  classification: string;
  confidence: number;
  tags: string[];
  verificationStatus: "VERIFIED" | "WARNING" | "UNVERIFIED";
  auditNotes: string;
  detectedTools: string[];
}

interface ImageMetadata {
  width: number;
  height: number;
  processingTimeMs: number;
  model: string;
  hash: string;
}

/**
 * Simulates a background AI/OCR processing pipeline for uploaded screenshots.
 * Resolves local code snippets, system logs, or invoice elements, then writes
 * the extracted metadata back into the Attachment database record.
 */
export async function analyzeAttachment(attachmentId: string): Promise<void> {
  // Run asynchronously in background without blocking the request
  setTimeout(async () => {
    try {
      console.log(`[AI-Analyzer] Initiating scan for attachment ID: ${attachmentId}...`);

      const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId },
        include: {
          card: true,
          hourLog: true,
          expense: true
        }
      });

      if (!attachment) {
        console.warn(`[AI-Analyzer] Attachment ${attachmentId} not found in database. Exiting.`);
        return;
      }

      // 1. Mark as processing
      await prisma.attachment.update({
        where: { id: attachmentId },
        data: { ocrStatus: "PROCESSING" }
      });

      // 2. Simulate heavy processing delay (2 seconds)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 3. Generate mock OCR text based on the upload context
      let ocrText = "";
      let classification = "General Screenshot";
      let tags: string[] = ["Proof of Work", "Project Tracker"];
      let detectedTools: string[] = ["Chrome Browser"];
      let auditNotes = "Proof of work validated. Image contents match general workspace activity.";
      let verificationStatus: "VERIFIED" | "WARNING" | "UNVERIFIED" = "VERIFIED";
      let confidence = 0.95;

      const cardTitle = attachment.card?.title || "";
      const cardDesc = attachment.card?.description || "";
      const logNotes = attachment.hourLog?.notes || "";
      const contextText = `${cardTitle} ${cardDesc} ${logNotes}`.toLowerCase();

      // Determine mock content based on context text keywords
      if (attachment.expense) {
        classification = "Invoice / Receipt";
        detectedTools = ["Receipt Scanner", "ProjectTracker-OCR-Engine"];
        tags = ["Expense", "Receipt", "Audit"];
        confidence = 0.99;
        ocrText = `
---------------------------------------------
            GAMMA HARDWARE STORE            
         Rotterdam, The Netherlands         
---------------------------------------------
DATE: ${attachment.expense.date.toISOString().split("T")[0]}
MERCHANT: ${attachment.expense.merchant}
CATEGORY: ${attachment.expense.category}
TOTAL: ${attachment.expense.amount} ${attachment.expense.currency}
TAX (VAT 21%): ${(Number(attachment.expense.amount) * 0.1735).toFixed(2)} EUR
---------------------------------------------
   THANK YOU FOR YOUR PURCHASE!
---------------------------------------------
        `.trim();
        auditNotes = `Receipt matches logged expense for "${attachment.expense.merchant}" of ${attachment.expense.amount} ${attachment.expense.currency}. Invoice structure validated successfully.`;
      } else if (contextText.includes("bug") || contextText.includes("fix") || contextText.includes("error")) {
        classification = "Git Terminal Logs / Console Error";
        detectedTools = ["Bash", "npm", "Git", "VS Code"];
        tags = ["Debug", "Terminal", "Error Logs"];
        confidence = 0.98;
        ocrText = `
$ npm run build
> kapetein-web@1.0.0 build
> vite build

vite v5.1.4 building for production...
✓ 456 modules transformed.
rendering chunks...
Error: [vite:css] CSS minification failed: Unexpected token in selector
File: /src/pages/employee/MyHours.css:23:12

npm ERR! Lifecycle script \`build\` failed with exit code 1
npm ERR! Failed at the kapetein-web@1.0.0 build script.
npm ERR! This is probably not a problem with npm, there is likely additional logging output above.
        `.trim();
        auditNotes = "Screenshot displays build error logs matching the logged debugging description. Validated task progress.";
      } else if (contextText.includes("database") || contextText.includes("schema") || contextText.includes("sql") || contextText.includes("prisma")) {
        classification = "IDE / Database GUI";
        detectedTools = ["VS Code", "Prisma Studio", "PostgreSQL"];
        tags = ["Database Schema", "Prisma Relation", "Backend"];
        confidence = 0.97;
        ocrText = `
model Attachment {
  id           String      @id @default(cuid())
  name         String
  url          String
  size         Int
  mimeType     String?
  uploadedById String
  projectId    String?
  cardId       String?
  hourLogId    String?
  ocrText      String?     @db.Text
  ocrStatus    String?     @default("PENDING")
  aiAnalysis   Json?
  metadata     Json?
}
        `.trim();
        auditNotes = "Screenshot contains Prisma schema model declarations correlating with schema database extensions.";
      } else if (contextText.includes("css") || contextText.includes("style") || contextText.includes("design") || contextText.includes("ui") || contextText.includes("modal")) {
        classification = "IDE / UI Layout Editor";
        detectedTools = ["VS Code", "Figma", "Google Chrome DevTools"];
        tags = ["CSS Styling", "Component Design", "Frontend"];
        confidence = 0.96;
        ocrText = `
/* Glassmorphism sidebar styling */
.glass-insights-sidebar {
  background: rgba(11, 18, 32, 0.7);
  backdrop-filter: blur(12px);
  border-left: 1px solid rgba(27, 42, 63, 0.5);
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.terminal-ocr-block {
  font-family: 'Fira Code', 'Courier New', monospace;
  background: rgba(3, 7, 18, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
        `.trim();
        auditNotes = "Visual validation indicates frontend CSS style modifications matching design enhancement guidelines.";
      } else {
        // Fallback standard coding screenshot
        classification = "IDE / Source Code Editor";
        detectedTools = ["VS Code", "TypeScript", "React"];
        tags = ["Code Development", "Component Flow", "TypeScript"];
        confidence = 0.94;
        ocrText = `
import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';

export function ActionPanel() {
  const [loading, setLoading] = useState(false);
  const handleAction = async () => {
    setLoading(true);
    await performAction();
    setLoading(false);
  };
  return <Button onClick={handleAction} loading={loading}>Save Progress</Button>;
}
        `.trim();
        auditNotes = "Screenshot verifies code structure changes matching general product coding logs.";
      }

      // Add a warning verification if notes are completely unrelated or empty, just to show AI auditing capabilities!
      if (!contextText.trim() || contextText.length < 5) {
        verificationStatus = "WARNING";
        auditNotes = "Audit Warning: Image uploaded without descriptive log notes. Unable to run task description correlation.";
      }

      const aiAnalysis: AIAnalysisResult = {
        classification,
        confidence,
        tags,
        verificationStatus,
        auditNotes,
        detectedTools
      };

      const metadata: ImageMetadata = {
        width: 1920,
        height: 1080,
        processingTimeMs: 1845,
        model: "ProjectTracker-Vision-OCR-v2",
        hash: Math.random().toString(36).substring(2, 15)
      };

      // 4. Save analysis back to DB
      await prisma.attachment.update({
        where: { id: attachmentId },
        data: {
          ocrText,
          ocrStatus: "COMPLETED",
          aiAnalysis: aiAnalysis as any,
          metadata: metadata as any
        }
      });

      console.log(`[AI-Analyzer] Attachment ID ${attachmentId} successfully scanned & updated.`);
    } catch (error) {
      console.error(`[AI-Analyzer] Failed to analyze attachment ${attachmentId}:`, error);
      try {
        await prisma.attachment.update({
          where: { id: attachmentId },
          data: { ocrStatus: "FAILED" }
        });
      } catch (err) {
        console.error("[AI-Analyzer] Failed to write error status back:", err);
      }
    }
  }, 100);
}
