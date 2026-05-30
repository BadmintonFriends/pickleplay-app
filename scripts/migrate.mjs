import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const drizzleDir = path.join(__dirname, "../drizzle");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const connection = await mysql.createConnection(url);

const files = fs
  .readdirSync(drizzleDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of files) {
  const sql = fs.readFileSync(path.join(drizzleDir, file), "utf-8");
  console.log(`Running ${file}...`);
  try {
    for (const statement of sql.split(";").filter((s) => s.trim())) {
      await connection.query(statement);
    }
    console.log(`  ✓ ${file}`);
  } catch (err) {
    console.warn(`  ⚠ ${file}: ${err.message}`);
  }
}

await connection.end();
console.log("Done.");
