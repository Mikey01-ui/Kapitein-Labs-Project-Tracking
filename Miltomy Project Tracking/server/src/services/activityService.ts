import { prisma } from "./prisma.js";

/**
 * Logs a workspace action to the database ActivityLog table.
 * Runs asynchronously without blocking request execution paths.
 */
export async function logActivity(
  userId: string,
  actionType: string,
  projectId: string | null = null,
  cardId: string | null = null,
  details: string | null = null
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        projectId: projectId || null,
        cardId: cardId || null,
        actionType,
        details: details || null
      }
    });
  } catch (error) {
    console.error(`[ActivityLog] Failed to record action [${actionType}]:`, error);
  }
}
