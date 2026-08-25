import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "uploads";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 10;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function localUploadsDir() {
  return path.join(__dirname, "../../uploads");
}

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return null;
  }
  return createClient(url, key);
}

export function isSupabaseStorageEnabled() {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export async function storeUpload(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<{ url: string; size: number; filename: string }> {
  const fileExt = path.extname(originalName) || ".png";
  const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${fileExt}`;
  const supabase = getSupabase();

  if (supabase) {
    const { error } = await supabase.storage.from(BUCKET).upload(uniqueFilename, buffer, {
      contentType: mimeType,
      upsert: false,
    });
    if (error) {
      throw error;
    }

    const { data, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(uniqueFilename, SIGNED_URL_TTL_SECONDS);
    if (signError || !data?.signedUrl) {
      throw signError ?? new Error("Failed to create a signed upload URL");
    }

    return { url: data.signedUrl, size: buffer.length, filename: uniqueFilename };
  }

  const dir = localUploadsDir();
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(path.join(dir, uniqueFilename), buffer);
  return { url: `/uploads/${uniqueFilename}`, size: buffer.length, filename: uniqueFilename };
}

export function storageObjectPath(url: string): string | null {
  if (url.startsWith("/uploads/")) {
    return url.slice("/uploads/".length);
  }

  try {
    const parsed = new URL(url);
    const markers = [
      `/object/sign/${BUCKET}/`,
      `/object/public/${BUCKET}/`,
      `/object/authenticated/${BUCKET}/`,
    ];
    for (const marker of markers) {
      const idx = parsed.pathname.indexOf(marker);
      if (idx !== -1) {
        return decodeURIComponent(parsed.pathname.slice(idx + marker.length));
      }
    }
  } catch {
    // not an absolute URL
  }

  return url.split("?")[0].split("/").pop() || null;
}

export async function getStoredFileSize(url: string): Promise<number> {
  const buffer = await readStoredFile(url);
  return buffer?.length ?? 0;
}

export async function readStoredFile(url: string): Promise<Buffer | null> {
  const objectPath = storageObjectPath(url);
  const supabase = getSupabase();

  if (supabase && objectPath && !url.startsWith("/uploads/")) {
    const { data, error } = await supabase.storage.from(BUCKET).download(objectPath);
    if (!error && data) {
      return Buffer.from(await data.arrayBuffer());
    }
  }

  if (objectPath) {
    const filePath = path.join(localUploadsDir(), objectPath);
    if (fs.existsSync(filePath)) {
      return fs.promises.readFile(filePath);
    }
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return Buffer.from(await response.arrayBuffer());
      }
    } catch (error) {
      console.error("Failed to fetch stored file:", error);
    }
  }

  return null;
}
