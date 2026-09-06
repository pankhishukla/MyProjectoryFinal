import { drizzle } from "drizzle-orm/mysql2"; // Drizzle ORM MySQL connector
import mysql from "mysql2/promise"; // MySQL2 promise-based driver
import { eq } from "drizzle-orm"; // for where comparisons
import * as schema from "./schema"; // IMPORTANT: point to schema folder
import { usersTable } from "./schema/users"; // MySQL users table definition
import pino from "pino"; // for logger

// Ensure DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

// Create MySQL connection pool
export const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Initialize Drizzle with schema
export const db = drizzle(pool, { schema, mode: "default" });

// Simple logger – only writes to stdout, no secrets ever logged.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: ["req.headers.authorization", "req.headers.cookie", "res.headers['set-cookie']"],
});

// Helper: find existing local user by Clerk ID. Returns the user ID number, or null if not found.
export async function getUserId(clerkId: string): Promise<number | null> {
  const [row] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkId, clerkId));
  return row?.id ?? null;
}

// Shared user mapping: find existing local user, or auto-create one using the Clerk user ID.
// – If a user row already exists, return its ID immediately.
// – In development, only auto-create for the known mock user IDs ("dev_user_id", "mock_admin_id").
// – In production, auto-create any new Clerk user with a minimal default record.
// – Duplicate users are never created (the existing ID is returned first).
export async function getOrCreateUserId(clerkId: string): Promise<number | null> {
  // 1) Check whether a user row already exists
  const existing = await getUserId(clerkId);
  if (existing !== null) return existing;

  // 2) Auto-create a new user row
  try {
    // Development: only auto-create for known mock user IDs
    const isDevMockUser = process.env.NODE_ENV === "development" &&
      (clerkId === "dev_user_id" || clerkId === "mock_admin_id");

    if (isDevMockUser) {
      const name = clerkId === "mock_admin_id" ? "Admin User" : "Development User";
      await db.insert(usersTable).values({ clerkId, name, email: `${clerkId}@localhost` });
      return await getUserId(clerkId);
    }

    // Production: auto-create any new Clerk user with a minimal default record
    await db.insert(usersTable).values({ clerkId, name: "User", email: "" });
    return await getUserId(clerkId);
  } catch (err) {
    logger.error({ clerkId, err }, "Failed to auto-create user");
    return null;
  }
}

// Startup diagnostics: determine the actual database selected by the connection
// This runs once at module load time (app startup) and logs only safe database names.
// Never logs DATABASE_URL, password, credentials, or user personal information.

// 1) Which database the connection selected
// Uses the pool's internal connection config to extract the database name from the URI.
const uri = (pool as any).config?.uri || process.env.DATABASE_URL;
const uriFromConfig = uri as string;

// Extract database name from mysql://user:password@host:port/dbname format
const dbNameFromUri = uriFromConfig?.split("/")[3]?.split("?")[0];

(async () => {
  try {
    // Primary: use SELECT DATABASE() which is reliable across all MySQL setups
    const [rows] = (await pool.query("SELECT DATABASE() AS database_name")) as [{ database_name: string; }];
    const dbName = (rows[0] as any).database_name;
    console.info({ database: dbName });
  } catch (err) {
    // Fallback: try to extract from URI if SELECT DATABASE() fails
    try {
      const fallbackDb = dbNameFromUri || "unknown";
      console.info({ database: fallbackDb, diagnostic_fallback: true });
    } catch {
      console.info({ database: "unknown", diagnostic_error: true });
    }
  }
})();

// 2) Whether the users table exists in the selected database
(async () => {
  try {
    const [rows] = (await pool.query<
      { table_count: number }[]
    >("SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'users'")) as [{ table_count: number }];
    const tableExists = rows[0].table_count > 0;
    console.info({ users_table_exists: tableExists });
  } catch (err) {
    console.error({ users_table_diagnostic_error: (err as Error).name + ":" + (err as Error).message });
  }
})();

// 3) Number of rows in the users table (safe aggregate only)
(async () => {
  try {
    const [rows] = (await pool.query<
      { user_count_from_db: number }[]
    >("SELECT COUNT(*) AS user_count_from_db FROM users")) as [{ user_count_from_db: number }];
    const countResult = rows[0].user_count_from_db;
    console.info({ user_count: countResult });
  } catch (err) {
    console.error({ users_count_diagnostic_error: (err as Error).name + ":" + (err as Error).message });
  }
})();

// Export schema if needed elsewhere
export * from "./schema";
