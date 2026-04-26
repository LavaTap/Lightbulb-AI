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

  database.run(`
    CREATE TABLE IF NOT EXISTS model_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      api_key TEXT,
      endpoint TEXT,
      use_proxy INTEGER DEFAULT 0,
      proxy_endpoint TEXT,
      category TEXT NOT NULL,
      capabilities TEXT,
      is_active INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

// Model Config Operations
export interface ModelConfigRow {
  id: number;
  name: string;
  provider: string;
  model: string;
  api_key: string | null;
  endpoint: string | null;
  use_proxy: number;
  proxy_endpoint: string | null;
  category: string;
  capabilities: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export async function getAllModelConfigs(): Promise<ModelConfigRow[]> {
  const database = await getDatabase();
  const results = database.exec('SELECT * FROM model_configs ORDER BY is_active DESC, updated_at DESC');
  if (results.length === 0) return [];
  
  const columns = results[0].columns;
  return results[0].values.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as ModelConfigRow;
  });
}

export async function getModelConfigById(id: number): Promise<ModelConfigRow | null> {
  const database = await getDatabase();
  const stmt = database.prepare('SELECT * FROM model_configs WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as ModelConfigRow;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export async function getActiveModelConfig(): Promise<ModelConfigRow | null> {
  const database = await getDatabase();
  const results = database.exec('SELECT * FROM model_configs WHERE is_active = 1 LIMIT 1');
  if (results.length === 0 || results[0].values.length === 0) return null;
  
  const columns = results[0].columns;
  const row = results[0].values[0];
  const obj: any = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });
  return obj as ModelConfigRow;
}

export async function saveModelConfig(config: Omit<ModelConfigRow, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const database = await getDatabase();
  database.run(`
    INSERT INTO model_configs (name, provider, model, api_key, endpoint, use_proxy, proxy_endpoint, category, capabilities, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    config.name,
    config.provider,
    config.model,
    config.api_key,
    config.endpoint,
    config.use_proxy,
    config.proxy_endpoint,
    config.category,
    config.capabilities,
    config.is_active
  ]);
  saveDatabase();
  
  const result = database.exec('SELECT last_insert_rowid() as id');
  return result[0].values[0][0] as number;
}

export async function updateModelConfig(id: number, config: Partial<ModelConfigRow>): Promise<void> {
  const database = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];
  
  if (config.name !== undefined) { fields.push('name = ?'); values.push(config.name); }
  if (config.provider !== undefined) { fields.push('provider = ?'); values.push(config.provider); }
  if (config.model !== undefined) { fields.push('model = ?'); values.push(config.model); }
  if (config.api_key !== undefined) { fields.push('api_key = ?'); values.push(config.api_key); }
  if (config.endpoint !== undefined) { fields.push('endpoint = ?'); values.push(config.endpoint); }
  if (config.use_proxy !== undefined) { fields.push('use_proxy = ?'); values.push(config.use_proxy); }
  if (config.proxy_endpoint !== undefined) { fields.push('proxy_endpoint = ?'); values.push(config.proxy_endpoint); }
  if (config.category !== undefined) { fields.push('category = ?'); values.push(config.category); }
  if (config.capabilities !== undefined) { fields.push('capabilities = ?'); values.push(config.capabilities); }
  if (config.is_active !== undefined) { fields.push('is_active = ?'); values.push(config.is_active); }
  
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  database.run(`UPDATE model_configs SET ${fields.join(', ')} WHERE id = ?`, values);
  saveDatabase();
}

export async function deleteModelConfig(id: number): Promise<void> {
  const database = await getDatabase();
  database.run('DELETE FROM model_configs WHERE id = ?', [id]);
  saveDatabase();
}

export async function setActiveModelConfig(id: number): Promise<void> {
  const database = await getDatabase();
  database.run('UPDATE model_configs SET is_active = 0');
  database.run('UPDATE model_configs SET is_active = 1 WHERE id = ?', [id]);
  saveDatabase();
}

// App Settings Operations
export async function getAppSetting(key: string): Promise<string | null> {
  const database = await getDatabase();
  const stmt = database.prepare('SELECT value FROM app_settings WHERE key = ?');
  stmt.bind([key]);
  if (stmt.step()) {
    const result = stmt.get()[0] as string;
    stmt.free();
    return result;
  }
  stmt.free();
  return null;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  const database = await getDatabase();
  database.run(`
    INSERT OR REPLACE INTO app_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `, [key, value]);
  saveDatabase();
}
