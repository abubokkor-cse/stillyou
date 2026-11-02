import "server-only";
import { neon } from "@neondatabase/serverless";
import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
  readdir,
} from "node:fs/promises";
import { join } from "node:path";

type Document<T> = { key: string; version: number; value: T };
const root = join(process.cwd(), ".stillyou", "documents");
const filename = (key: string) =>
  join(root, `${createHash("sha256").update(key).digest("hex")}.json`);

function database() {
  if (process.env.DATABASE_URL) return neon(process.env.DATABASE_URL);
  if (process.env.VERCEL || process.env.NODE_ENV === "production")
    throw new Error("DATABASE_URL is required in production.");
  return null;
}

async function readDocument<T>(key: string): Promise<Document<T> | null> {
  const sql = database();
  if (sql) {
    const rows =
      await sql`SELECT version, value FROM stillyou_documents WHERE key = ${key}`;
    return rows[0]
      ? { key, version: rows[0].version, value: rows[0].value as T }
      : null;
  }
  try {
    return JSON.parse(await readFile(filename(key), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function read<T>(key: string) {
  return (await readDocument<T>(key))?.value ?? null;
}

export async function mutate<T>(
  key: string,
  change: (value: T | null) => T | null,
): Promise<T | null> {
  const sql = database();
  if (sql) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const current = await readDocument<T>(key);
      const value = change(current?.value ?? null);
      if (!current && value === null) return null;
      const rows =
        value === null
          ? await sql`DELETE FROM stillyou_documents WHERE key = ${key} AND version = ${current!.version} RETURNING key`
          : current
            ? await sql`UPDATE stillyou_documents SET value = ${JSON.stringify(value)}::jsonb, version = version + 1 WHERE key = ${key} AND version = ${current.version} RETURNING key`
            : await sql`INSERT INTO stillyou_documents (key, value, version) VALUES (${key}, ${JSON.stringify(value)}::jsonb, 1) ON CONFLICT DO NOTHING RETURNING key`;
      if (rows.length) return value;
    }
    throw new Error("Workspace is busy. Please try again.");
  }
  await mkdir(root, { recursive: true, mode: 0o700 });
  const file = filename(key);
  const lock = `${file}.lock`;
  const deadline = Date.now() + 10_000;
  for (;;) {
    try {
      await mkdir(lock);
      break;
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code !== "EEXIST" ||
        Date.now() > deadline
      )
        throw error;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  try {
    const current = await readDocument<T>(key);
    const value = change(current?.value ?? null);
    if (value === null) await rm(file, { force: true });
    else {
      const temp = `${file}.${randomUUID()}.tmp`;
      await writeFile(
        temp,
        JSON.stringify({ key, value, version: (current?.version ?? 0) + 1 }),
        { mode: 0o600 },
      );
      await rename(temp, file);
    }
    return value;
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
}

export async function listExpiredWorkspaces() {
  const sql = database();
  if (sql) {
    const rows =
      await sql`SELECT value FROM stillyou_documents WHERE key LIKE 'workspace:%' AND value->>'expiresAt' < ${new Date().toISOString()} LIMIT 100`;
    return rows.map((row) => row.value as import("@/lib/types").Workspace);
  }
  await mkdir(root, { recursive: true });
  const result: import("@/lib/types").Workspace[] = [];
  for (const file of await readdir(root)) {
    if (!file.endsWith(".json")) continue;
    const doc = JSON.parse(await readFile(join(root, file), "utf8"));
    if (
      doc.key.startsWith("workspace:") &&
      doc.value.expiresAt < new Date().toISOString()
    )
      result.push(doc.value);
  }
  return result;
}
