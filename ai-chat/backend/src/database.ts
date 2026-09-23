import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'ai-chat.db');

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
  try {
    saveDatabase();
  } catch (err) {
    console.error('[Database] Initial save failed (non-fatal):', err);
  }
}

function initDatabase(database: SqlJsDatabase): void {
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
    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      avatar_color TEXT NOT NULL DEFAULT '#6c5ce7',
      subtitle TEXT,
      identity TEXT NOT NULL,
      scene_setting TEXT NOT NULL,
      language_style TEXT NOT NULL,
      behavior_rules TEXT NOT NULL,
      system_prompt TEXT NOT NULL,
      is_preset INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS character_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT '新对话',
      message_count INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS character_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      character_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content TEXT NOT NULL,
      emotion TEXT,
      emotion_intensity REAL,
      token_usage INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES character_conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    );
  `);

  database.run(`CREATE INDEX IF NOT EXISTS idx_char_convs_char ON character_conversations(character_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_char_convs_updated ON character_conversations(updated_at DESC)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_char_msgs_conv ON character_messages(conversation_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_model_configs_active ON model_configs(is_active)`);
}

export function saveDatabase(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      fs.writeFileSync(dbPath, buffer);
      return;
    } catch (err: any) {
      lastError = err;
      if (attempt < 2) {
        const start = Date.now();
        while (Date.now() - start < 200) { /* busy wait */ }
      }
    }
  }
  console.error(`[Database] Failed to save database after 3 attempts:`, lastError?.message);
}

export async function getDatabase(): Promise<SqlJsDatabase> {
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

// ============ Model Config Operations ============

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
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj as ModelConfigRow;
  });
}

export async function getActiveModelConfig(): Promise<ModelConfigRow | null> {
  const database = await getDatabase();
  const results = database.exec('SELECT * FROM model_configs WHERE is_active = 1 LIMIT 1');
  if (results.length === 0 || results[0].values.length === 0) return null;
  const columns = results[0].columns;
  const row = results[0].values[0];
  const obj: any = {};
  columns.forEach((col, i) => { obj[col] = row[i]; });
  return obj as ModelConfigRow;
}

export async function saveModelConfig(config: Omit<ModelConfigRow, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const database = await getDatabase();
  database.run(`
    INSERT INTO model_configs (name, provider, model, api_key, endpoint, use_proxy, proxy_endpoint, category, capabilities, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    config.name, config.provider, config.model, config.api_key,
    config.endpoint, config.use_proxy, config.proxy_endpoint,
    config.category, config.capabilities, config.is_active
  ]);
  const result = database.exec('SELECT last_insert_rowid() as id');
  const id = result[0].values[0][0] as number;
  saveDatabase();
  return id;
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

export async function getModelConfigById(id: number): Promise<ModelConfigRow | null> {
  const database = await getDatabase();
  const stmt = database.prepare('SELECT * FROM model_configs WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as ModelConfigRow;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

// ============ Character Operations ============

export interface CharacterRow {
  id: number;
  name: string;
  avatar_color: string;
  subtitle: string | null;
  identity: string;
  scene_setting: string;
  language_style: string;
  behavior_rules: string;
  system_prompt: string;
  is_preset: number;
  created_at: string;
  updated_at: string;
}

export interface CharacterConversationRow {
  id: number;
  character_id: number;
  title: string;
  message_count: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export interface CharacterMessageRow {
  id: number;
  conversation_id: number;
  character_id: number;
  role: 'user' | 'assistant';
  content: string;
  emotion: string | null;
  emotion_intensity: number | null;
  token_usage: number;
  created_at: string;
}

export async function getAllCharacters(): Promise<CharacterRow[]> {
  const database = await getDatabase();
  const results = database.exec('SELECT * FROM characters ORDER BY is_preset DESC, updated_at DESC');
  if (results.length === 0) return [];
  const columns = results[0].columns;
  return results[0].values.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj as CharacterRow;
  });
}

export async function getCharacterById(id: number): Promise<CharacterRow | null> {
  const database = await getDatabase();
  const stmt = database.prepare('SELECT * FROM characters WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as CharacterRow;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export async function createCharacter(data: {
  name: string;
  avatar_color?: string;
  subtitle?: string;
  identity: string;
  scene_setting: string;
  language_style: string;
  behavior_rules: string;
  system_prompt: string;
  is_preset?: number;
}): Promise<number> {
  const database = await getDatabase();
  database.run(
    `INSERT INTO characters (name, avatar_color, subtitle, identity, scene_setting, language_style, behavior_rules, system_prompt, is_preset)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.name, data.avatar_color || '#6c5ce7', data.subtitle || null, data.identity, data.scene_setting, data.language_style, data.behavior_rules, data.system_prompt, data.is_preset || 0]
  );
  const result = database.exec('SELECT last_insert_rowid() as id');
  const id = result[0].values[0][0] as number;
  saveDatabase();
  return id;
}

export async function updateCharacter(id: number, data: Partial<Omit<CharacterRow, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
  const database = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];
  const allowedFields = ['name', 'avatar_color', 'subtitle', 'identity', 'scene_setting', 'language_style', 'behavior_rules', 'system_prompt', 'is_preset'];
  for (const field of allowedFields) {
    if ((data as any)[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push((data as any)[field]);
    }
  }
  if (fields.length === 0) return;
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  database.run(`UPDATE characters SET ${fields.join(', ')} WHERE id = ?`, values);
  saveDatabase();
}

export async function deleteCharacter(id: number): Promise<void> {
  const database = await getDatabase();
  database.run('DELETE FROM characters WHERE id = ?', [id]);
  saveDatabase();
}

// Character Conversation CRUD
export async function getCharacterConversations(characterId: number): Promise<CharacterConversationRow[]> {
  const database = await getDatabase();
  const results = database.exec(
    'SELECT * FROM character_conversations WHERE character_id = ? ORDER BY updated_at DESC',
    [characterId]
  );
  if (results.length === 0) return [];
  const columns = results[0].columns;
  return results[0].values.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj as CharacterConversationRow;
  });
}

export async function getCharacterConversationById(id: number): Promise<CharacterConversationRow | null> {
  const database = await getDatabase();
  const stmt = database.prepare('SELECT * FROM character_conversations WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as CharacterConversationRow;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export async function createCharacterConversation(data: {
  character_id: number;
  title?: string;
}): Promise<number> {
  const database = await getDatabase();
  database.run(
    'INSERT INTO character_conversations (character_id, title) VALUES (?, ?)',
    [data.character_id, data.title || '新对话']
  );
  const result = database.exec('SELECT last_insert_rowid() as id');
  const id = result[0].values[0][0] as number;
  saveDatabase();
  return id;
}

export async function deleteCharacterConversation(id: number): Promise<void> {
  const database = await getDatabase();
  database.run('DELETE FROM character_conversations WHERE id = ?', [id]);
  saveDatabase();
}

// Character Message CRUD
export async function getCharacterMessages(conversationId: number): Promise<CharacterMessageRow[]> {
  const database = await getDatabase();
  const results = database.exec(
    'SELECT * FROM character_messages WHERE conversation_id = ? ORDER BY created_at ASC',
    [conversationId]
  );
  if (results.length === 0) return [];
  const columns = results[0].columns;
  return results[0].values.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj as CharacterMessageRow;
  });
}

export async function createCharacterMessage(data: {
  conversation_id: number;
  character_id: number;
  role: 'user' | 'assistant';
  content: string;
  emotion?: string;
  emotion_intensity?: number;
  token_usage?: number;
}): Promise<number> {
  const database = await getDatabase();
  database.run(
    `INSERT INTO character_messages (conversation_id, character_id, role, content, emotion, emotion_intensity, token_usage)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.conversation_id, data.character_id, data.role, data.content, data.emotion || null, data.emotion_intensity || null, data.token_usage || 0]
  );
  database.run(
    'UPDATE character_conversations SET message_count = message_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [data.conversation_id]
  );
  const result = database.exec('SELECT last_insert_rowid() as id');
  const id = result[0].values[0][0] as number;
  saveDatabase();
  return id;
}

// Character Test Run
export async function createCharacterTestRun(data: {
  character_id: number;
  total: number;
  passed: number;
  failed: number;
  results?: string;
  analysis?: string;
  model_info?: string;
}): Promise<number> {
  const database = await getDatabase();

  // Ensure table exists
  database.run(`
    CREATE TABLE IF NOT EXISTS character_test_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      total INTEGER DEFAULT 0,
      passed INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      results TEXT,
      analysis TEXT,
      model_info TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    );
  `);

  database.run(
    `INSERT INTO character_test_runs (character_id, total, passed, failed, results, analysis, model_info)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.character_id, data.total, data.passed, data.failed, data.results || null, data.analysis || null, data.model_info || null]
  );
  const result = database.exec('SELECT last_insert_rowid() as id');
  const id = result[0].values[0][0] as number;
  saveDatabase();
  return id;
}
