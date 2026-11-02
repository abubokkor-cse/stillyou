import { neon } from "@neondatabase/serverless";

async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("Set DATABASE_URL in .env.local first.");
  const sql = neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS stillyou_documents (key text PRIMARY KEY, value jsonb NOT NULL, version integer NOT NULL DEFAULT 1)`;
  console.log("StillYou database is ready.");
}
main().catch(() => {
  console.error(
    "Database setup failed. Check DATABASE_URL and database access.",
  );
  process.exitCode = 1;
});
