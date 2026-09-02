export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }

  return "miltomy-agency-development-secret-key";
}

export function getAllowedOrigins(): string[] {
  return (process.env.CLIENT_ORIGIN ?? "http://localhost:5173,http://localhost:8080")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getEnv(key: string, defaultValue: string = ""): string {
  return process.env[key] || defaultValue;
}
