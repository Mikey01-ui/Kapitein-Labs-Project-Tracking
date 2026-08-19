import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  listMyHours,
  createHourLog,
  updateHourLog,
  deleteHourLog,
  listProjectHours,
  listUserHours,
  listCardHours
} from "../controllers/hours.controller.js";

export const hoursRouter = Router();
hoursRouter.use(requireAuth);


hoursRouter.get("/", listMyHours);
hoursRouter.post("/", createHourLog);
hoursRouter.put("/:id", updateHourLog);
hoursRouter.delete("/:id", deleteHourLog);
hoursRouter.get("/project/:id", listProjectHours);
hoursRouter.get("/user/:id", listUserHours);
hoursRouter.get("/card/:cardId", listCardHours);

