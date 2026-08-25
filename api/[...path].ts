import "dotenv/config";
import type { IncomingMessage, ServerResponse } from "node:http";
import { app } from "../server/src/app.js";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const original = req.url ?? "/";
  if (!original.startsWith("/api")) {
    req.url = original === "/" ? "/api" : `/api${original.startsWith("/") ? original : `/${original}`}`;
  }
  return app(req, res);
}
