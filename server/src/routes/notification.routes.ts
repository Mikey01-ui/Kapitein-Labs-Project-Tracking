import { Router } from "express";
import { sendEmailNotification, getNotifications, markAsRead, markAllAsRead } from "../controllers/notification.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const notificationRouter = Router();

notificationRouter.post("/send-email", requireAuth, sendEmailNotification);
notificationRouter.get("/", requireAuth, getNotifications);
notificationRouter.put("/:id/read", requireAuth, markAsRead);
notificationRouter.post("/read-all", requireAuth, markAllAsRead);
