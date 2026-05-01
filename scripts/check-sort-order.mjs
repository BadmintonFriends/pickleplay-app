import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute('DESCRIBE tournament_events');
const cols = rows.map(r => r.Field);
console.log('Columns:', cols.join(', '));
if (cols.indexOf('sortOrder') === -1) {
  console.log('sortOrder column missing, adding...');
  await conn.execute('ALTER TABLE tournament_events ADD COLUMN sortOrder int NOT NULL DEFAULT 0');
  console.log('sortOrder column added');
} else {
  console.log('sortOrder column already exists');
}
await conn.end();
