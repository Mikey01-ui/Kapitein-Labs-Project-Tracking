import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./routes/auth.routes.js";
import { hoursRouter } from "./routes/hours.routes.js";
import { kanbanRouter } from "./routes/kanban.routes.js";
import { milestonesRouter } from "./routes/milestones.routes.js";
import { projectsRouter } from "./routes/projects.routes.js";
import { reportsRouter } from "./routes/reports.routes.js";
import { usersRouter } from "./routes/users.routes.js";
import { notificationRouter } from "./routes/notification.routes.js";
import { uploadRouter } from "./routes/upload.routes.js";
import { activityRouter } from "./routes/activity.routes.js";
import { aiOnboardingRouter } from "./routes/aiOnboarding.routes.js";
import { expensesRouter } from "./routes/expenses.routes.js";
import { getAllowedOrigins } from "./utils/env.js";
import { isSupabaseStorageEnabled } from "./services/storage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

const allowedOrigins = getAllowedOrigins();

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes("*") ||
        origin.endsWith(".vercel.app")
      ) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  })
);
app.use(express.json({ limit: "4.5mb" }));
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url} - Host: ${req.headers.host}`);
  next();
});

if (!isSupabaseStorageEnabled()) {
  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/hours", hoursRouter);
app.use("/api/milestones", milestonesRouter);
app.use("/api/kanban", kanbanRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/users", usersRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/activities", activityRouter);
app.use("/api/ai/onboarding", aiOnboardingRouter);
app.use("/api/expenses", expensesRouter);
app.use(errorHandler);
