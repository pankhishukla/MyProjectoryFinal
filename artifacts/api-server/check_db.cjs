const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, ".env") });

const dbUrl = "mysql://careerstack:careerstack@localhost:3307/careerstack";

async function main() {
  console.log("Connecting to:", dbUrl);
  try {
    const connection = await mysql.createConnection(dbUrl);
    const [tables] = await connection.query("SHOW TABLES");
    console.log("Tables in database:", tables);
    
    // Check if portfolios table has columns
    try {
      const [cols] = await connection.query("DESCRIBE portfolios");
      console.log("Columns in portfolios table:", cols);
    } catch (e) {
      console.error("Error describing portfolios:", e.message);
    }
    await connection.end();
  } catch (err) {
    console.error("Database connection failed:", err);
  }
}

main();
