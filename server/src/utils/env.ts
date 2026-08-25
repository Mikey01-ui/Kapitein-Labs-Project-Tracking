export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }

  return "kapetein-labs-development-secret-key";
}

const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:8080",
  "https://www.proj.kapiteinlabs.com",
  "https://proj.kapiteinlabs.com",
];

export function getAllowedOrigins(): string[] {
  const fromEnv = (process.env.CLIENT_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...new Set([...DEFAULT_ORIGINS, ...fromEnv])];
}
