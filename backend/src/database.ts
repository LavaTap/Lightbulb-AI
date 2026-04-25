import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'lightbulb.db');

let db: SqlJsDatabase | null = null;
let dbReady: Promise<void> | null = null;

async function initDb(): Promise<void> {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  initDatabase(db);
  saveDatabase();
}

function initDatabase(database: SqlJsDatabase): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS generation_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feature_type TEXT NOT NULL,
      prompt TEXT,
      upload_images TEXT,
      generated_images TEXT,
      model_provider TEXT,
      model_name TEXT,
      token_usage INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export function saveDatabase(): void {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

export async function getDatabase(): Promise<SqlJsDatabase> {
  if (db) return db;
  if (!dbReady) {
    dbReady = initDb();
  }
  await dbReady;
  return db!;
}

export async function getDatabaseSync(): Promise<SqlJsDatabase> {
  if (db) return db;
  if (!dbReady) {
    dbReady = initDb();
  }
  await dbReady;
  return db!;
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}
