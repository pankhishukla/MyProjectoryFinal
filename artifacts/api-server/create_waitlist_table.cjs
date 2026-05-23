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
    
    console.log("Creating waitlist table if it does not exist...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    
    console.log("Waitlist table ready.");
    await connection.end();
  } catch (err) {
    console.error("Database connection/query failed:", err);
  }
}

main();
