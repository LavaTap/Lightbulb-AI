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
  try {
    saveDatabase();
  } catch (err) {
    console.error('[Database] Initial save failed (non-fatal):', err);
  }
}

function initDatabase(database: SqlJsDatabase): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS generation_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feature_type TEXT NOT NULL,
      prompt TEXT,
      upload_images TEXT,
      generated_images TEXT,
      upload_images_original TEXT,
      generated_images_original TEXT,
      model_provider TEXT,
      model_name TEXT,
      token_usage INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 兼容旧数据库：检查并添加 Original 字段
  const columnsResult = database.exec("PRAGMA table_info(generation_records)");
  const existingColumns = columnsResult[0]?.values?.map((row: any[]) => row[1]) || [];
  
  if (!existingColumns.includes('upload_images_original')) {
    database.run(`ALTER TABLE generation_records ADD COLUMN upload_images_original TEXT`);
  }
  if (!existingColumns.includes('generated_images_original')) {
    database.run(`ALTER TABLE generation_records ADD COLUMN generated_images_original TEXT`);
  }

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

  // MCP (Model Control Plane) 相关表
  database.run(`
    CREATE TABLE IF NOT EXISTS model_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_id INTEGER NOT NULL,
      instance_id TEXT NOT NULL UNIQUE,
      endpoint TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active', -- active, inactive, degraded
      region TEXT,
      version TEXT,
      capacity INTEGER DEFAULT 100, -- 并发处理能力
      current_load INTEGER DEFAULT 0, -- 当前负载
      last_heartbeat DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (config_id) REFERENCES model_configs(id) ON DELETE CASCADE
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS model_health_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      instance_id TEXT NOT NULL,
      check_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL, -- success, failed, degraded
      latency INTEGER, -- 响应时间(ms)
      error_message TEXT,
      FOREIGN KEY (instance_id) REFERENCES model_instances(instance_id) ON DELETE CASCADE
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS model_usage_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_id INTEGER NOT NULL,
      instance_id TEXT,
      feature_type TEXT,
      request_count INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      total_latency INTEGER DEFAULT 0, -- 总响应时间(ms)
      total_tokens_used INTEGER DEFAULT 0,
      period_start DATETIME NOT NULL,
      period_end DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (config_id) REFERENCES model_configs(id) ON DELETE CASCADE,
      FOREIGN KEY (instance_id) REFERENCES model_instances(instance_id) ON DELETE SET NULL
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS model_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_id INTEGER NOT NULL,
      tag_key TEXT NOT NULL,
      tag_value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (config_id) REFERENCES model_configs(id) ON DELETE CASCADE,
      UNIQUE(config_id, tag_key)
    );
  `);

  // AI 对话相关表
  database.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '新对话',
      model_provider TEXT NOT NULL,
      model_name TEXT NOT NULL,
      system_prompt TEXT,
      summary TEXT,
      summary_updated_at DATETIME,
      message_count INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('system','user','assistant')),
      content TEXT NOT NULL,
      token_usage INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `);

  database.run(`CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC)`);

  // 兼容旧数据库：检查并添加 attachments 字段到 chat_messages
  const msgColumnsResult = database.exec("PRAGMA table_info(chat_messages)");
  const msgExistingColumns = msgColumnsResult[0]?.values?.map((row: any[]) => row[1]) || [];
  if (!msgExistingColumns.includes('attachments')) {
    database.run(`ALTER TABLE chat_messages ADD COLUMN attachments TEXT`);
  }

  // 创建索引以提高搜索性能
  database.run(`CREATE INDEX IF NOT EXISTS idx_model_instances_status ON model_instances(status)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_model_instances_config_id ON model_instances(config_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_model_health_checks_instance_id ON model_health_checks(instance_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_model_health_checks_check_time ON model_health_checks(check_time)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_model_usage_stats_config_id ON model_usage_stats(config_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_model_usage_stats_period ON model_usage_stats(period_start, period_end)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_model_tags_config_id ON model_tags(config_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_model_tags_key_value ON model_tags(tag_key, tag_value)`);

  // AI 角色对话相关表
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

  // 角色测试相关表
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

  // 迁移: character_test_runs 增加 model_info 字段
  const testRunColumnsResult = database.exec("PRAGMA table_info(character_test_runs)");
  const testRunExistingColumns = testRunColumnsResult[0]?.values?.map((row: any[]) => row[1]) || [];
  if (!testRunExistingColumns.includes('model_info')) {
    database.run(`ALTER TABLE character_test_runs ADD COLUMN model_info TEXT`);
  }
}

export function saveDatabase(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  // Windows 上文件可能被临时锁定（防病毒扫描/其他进程），重试 3 次
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      fs.writeFileSync(dbPath, buffer);
      return;
    } catch (err: any) {
      lastError = err;
      if (attempt < 2) {
        // 同步忙等 200ms 后重试（Windows 文件锁短暂释放）
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
    const row = stmt.getAsObject() as unknown as ModelConfigRow;
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

// Conversation Operations
export interface ConversationRow {
  id: number;
  title: string;
  model_provider: string;
  model_name: string;
  system_prompt: string | null;
  summary: string | null;
  summary_updated_at: string | null;
  message_count: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageRow {
  id: number;
  conversation_id: number;
  role: 'system' | 'user' | 'assistant';
  content: string;
  token_usage: number;
  attachments: string | null;
  created_at: string;
}

export async function getAllConversations(page = 1, pageSize = 20): Promise<{ conversations: ConversationRow[]; total: number }> {
  const database = await getDatabase();
  const offset = (page - 1) * pageSize;

  const countResult = database.exec('SELECT COUNT(*) as total FROM conversations');
  const total = countResult.length > 0 ? (countResult[0].values[0][0] as number) : 0;

  const results = database.exec(
    'SELECT * FROM conversations ORDER BY updated_at DESC LIMIT ? OFFSET ?',
    [pageSize, offset]
  );
  if (results.length === 0) return { conversations: [], total };

  const columns = results[0].columns;
  const conversations = results[0].values.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj as ConversationRow;
  });

  return { conversations, total };
}

export async function getConversationById(id: number): Promise<ConversationRow | null> {
  const database = await getDatabase();
  const stmt = database.prepare('SELECT * FROM conversations WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as ConversationRow;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export async function createConversation(data: {
  title?: string;
  model_provider: string;
  model_name: string;
  system_prompt?: string;
}): Promise<number> {
  const database = await getDatabase();
  database.run(
    'INSERT INTO conversations (title, model_provider, model_name, system_prompt) VALUES (?, ?, ?, ?)',
    [data.title || '新对话', data.model_provider, data.model_name, data.system_prompt || null]
  );

  const result = database.exec('SELECT last_insert_rowid() as id');
  const id = result[0].values[0][0] as number;
  saveDatabase();
  return id;
}

export async function updateConversation(id: number, data: Partial<Pick<ConversationRow, 'title' | 'system_prompt' | 'summary' | 'summary_updated_at' | 'message_count' | 'is_archived'>>): Promise<void> {
  const database = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.system_prompt !== undefined) { fields.push('system_prompt = ?'); values.push(data.system_prompt); }
  if (data.summary !== undefined) { fields.push('summary = ?'); values.push(data.summary); }
  if (data.summary_updated_at !== undefined) { fields.push('summary_updated_at = ?'); values.push(data.summary_updated_at); }
  if (data.message_count !== undefined) { fields.push('message_count = ?'); values.push(data.message_count); }
  if (data.is_archived !== undefined) { fields.push('is_archived = ?'); values.push(data.is_archived); }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  database.run(`UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`, values);
  saveDatabase();
}

export async function deleteConversation(id: number): Promise<void> {
  const database = await getDatabase();
  database.run('DELETE FROM conversations WHERE id = ?', [id]);
  saveDatabase();
}

export async function getMessagesByConversationId(conversationId: number): Promise<ChatMessageRow[]> {
  const database = await getDatabase();
  const results = database.exec(
    'SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC',
    [conversationId]
  );
  if (results.length === 0) return [];

  const columns = results[0].columns;
  return results[0].values.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj as ChatMessageRow;
  });
}

export async function createMessage(data: {
  conversation_id: number;
  role: 'system' | 'user' | 'assistant';
  content: string;
  token_usage?: number;
  attachments?: string;
}): Promise<number> {
  const database = await getDatabase();
  database.run(
    'INSERT INTO chat_messages (conversation_id, role, content, token_usage, attachments) VALUES (?, ?, ?, ?, ?)',
    [data.conversation_id, data.role, data.content, data.token_usage || 0, data.attachments || null]
  );

  // 更新对话的 message_count 和 updated_at
  database.run(
    'UPDATE conversations SET message_count = message_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [data.conversation_id]
  );

  const result = database.exec('SELECT last_insert_rowid() as id');
  const id = result[0].values[0][0] as number;
  saveDatabase();
  return id;
}

export async function deleteMessageById(messageId: number): Promise<void> {
  const database = await getDatabase();
  // 先获取 conversation_id，再删除消息
  const result = database.exec('SELECT conversation_id FROM chat_messages WHERE id = ?', [messageId]);
  if (result.length === 0 || result[0].values.length === 0) return;
  const conversationId = result[0].values[0][0] as number;

  database.run('DELETE FROM chat_messages WHERE id = ?', [messageId]);
  database.run(
    'UPDATE conversations SET message_count = MAX(0, message_count - 1), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [conversationId]
  );
  saveDatabase();
}

export async function getMessageCount(conversationId: number): Promise<number> {
  const database = await getDatabase();
  const result = database.exec('SELECT COUNT(*) as count FROM chat_messages WHERE conversation_id = ?', [conversationId]);
  return result.length > 0 ? (result[0].values[0][0] as number) : 0;
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

export interface CharacterTestRunRow {
  id: number;
  character_id: number;
  total: number;
  passed: number;
  failed: number;
  results: string | null;
  analysis: string | null;
  created_at: string;
}

// Character CRUD
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

export async function updateCharacterConversation(id: number, data: Partial<Pick<CharacterConversationRow, 'title' | 'message_count' | 'is_archived'>>): Promise<void> {
  const database = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];
  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.message_count !== undefined) { fields.push('message_count = ?'); values.push(data.message_count); }
  if (data.is_archived !== undefined) { fields.push('is_archived = ?'); values.push(data.is_archived); }
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  database.run(`UPDATE character_conversations SET ${fields.join(', ')} WHERE id = ?`, values);
  saveDatabase();
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

// Character Test Run CRUD
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

export async function getCharacterTestRuns(characterId: number): Promise<CharacterTestRunRow[]> {
  const database = await getDatabase();
  const results = database.exec(
    'SELECT * FROM character_test_runs WHERE character_id = ? ORDER BY created_at DESC',
    [characterId]
  );
  if (results.length === 0) return [];
  const columns = results[0].columns;
  return results[0].values.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj as CharacterTestRunRow;
  });
}
