import { drizzle } from "drizzle-orm/mysql2"; // Drizzle ORM MySQL connector
import mysql from "mysql2/promise"; // MySQL2 promise-based driver
import * as schema from "./schema"; // IMPORTANT: point to schema folder

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
    const [rows] = await pool.query("SELECT DATABASE() AS database_name");
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
    // Use information_schema to check if users table exists in the current database
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'users'"
    );
    const tableExists = (rows[0] as any).table_count > 0;
    console.info({ users_table_exists: tableExists });
  } catch (err) {
    console.error({ users_table_diagnostic_error: (err as Error).name + ":" + (err as Error).message });
  }
})();

// 3) Number of rows in the users table (safe aggregate only)
(async () => {
  try {
    const [rows] = await pool.query("SELECT COUNT(*) AS user_count_from_db FROM users");
    const countResult = (rows[0] as any).user_count_from_db;
    console.info({ user_count: countResult });
  } catch (err) {
    console.error({ users_count_diagnostic_error: (err as Error).name + ":" + (err as Error).message });
  }
})();

// Export schema if needed elsewhere
export * from "./schema";
