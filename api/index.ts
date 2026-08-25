import "dotenv/config";
import type { IncomingMessage, ServerResponse } from "node:http";
import { app } from "../server/src/app.js";

function headerValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const forwarded = headerValue(req.headers["x-forwarded-uri"])
    ?? headerValue(req.headers["x-invoke-query"] as string | undefined);
  const originalUrl = req.url ?? "/";

  if (typeof forwarded === "string" && forwarded.startsWith("/api")) {
    const queryIndex = originalUrl.indexOf("?");
    req.url = queryIndex >= 0 ? `${forwarded.split("?")[0]}${originalUrl.slice(queryIndex)}` : forwarded.split("?")[0];
  } else if (!originalUrl.startsWith("/api")) {
    req.url = originalUrl === "/" ? "/api" : `/api${originalUrl.startsWith("/") ? originalUrl : `/${originalUrl}`}`;
  }

  return app(req, res);
}
