import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve("../../.env") });
dotenv.config({ path: path.resolve(".env") });

const dbUrl = process.env.DATABASE_URL || "mysql://careerstack:careerstack@localhost:3306/careerstack";

async function main() {
  console.log("Connecting to:", dbUrl);
  const connection = await mysql.createConnection(dbUrl);
  try {
    const [tables] = await connection.query("SHOW TABLES");
    console.log("Tables in database:", tables);
    
    // Check if portfolios table has columns
    try {
      const [cols] = await connection.query("DESCRIBE portfolios");
      console.log("Columns in portfolios table:", cols);
    } catch (e) {
      console.error("Error describing portfolios:", e.message);
    }
  } catch (err) {
    console.error("Database connection failed:", err);
  } finally {
    await connection.end();
  }
}

main();
