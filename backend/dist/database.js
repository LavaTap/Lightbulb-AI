"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveDatabase = saveDatabase;
exports.getDatabase = getDatabase;
exports.getDatabaseSync = getDatabaseSync;
exports.closeDatabase = closeDatabase;
exports.getAllModelConfigs = getAllModelConfigs;
exports.getModelConfigById = getModelConfigById;
exports.getActiveModelConfig = getActiveModelConfig;
exports.saveModelConfig = saveModelConfig;
exports.updateModelConfig = updateModelConfig;
exports.deleteModelConfig = deleteModelConfig;
exports.setActiveModelConfig = setActiveModelConfig;
exports.getAppSetting = getAppSetting;
exports.setAppSetting = setAppSetting;
exports.getAllConversations = getAllConversations;
exports.getConversationById = getConversationById;
exports.createConversation = createConversation;
exports.updateConversation = updateConversation;
exports.deleteConversation = deleteConversation;
exports.getMessagesByConversationId = getMessagesByConversationId;
exports.createMessage = createMessage;
exports.getMessageCount = getMessageCount;
const sql_js_1 = __importDefault(require("sql.js"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const url_1 = require("url");
const __dirname = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
const dataDir = path_1.default.join(__dirname, '..', '..', 'data');
const dbPath = path_1.default.join(dataDir, 'lightbulb.db');
let db = null;
let dbReady = null;
async function initDb() {
    if (!fs_1.default.existsSync(dataDir)) {
        fs_1.default.mkdirSync(dataDir, { recursive: true });
    }
    const SQL = await (0, sql_js_1.default)();
    if (fs_1.default.existsSync(dbPath)) {
        const fileBuffer = fs_1.default.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
    }
    else {
        db = new SQL.Database();
    }
    initDatabase(db);
    saveDatabase();
}
function initDatabase(database) {
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
    const existingColumns = columnsResult[0]?.values?.map((row) => row[1]) || [];
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
    const msgExistingColumns = msgColumnsResult[0]?.values?.map((row) => row[1]) || [];
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
}
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs_1.default.writeFileSync(dbPath, buffer);
    }
}
async function getDatabase() {
    if (db)
        return db;
    if (!dbReady) {
        dbReady = initDb();
    }
    await dbReady;
    return db;
}
async function getDatabaseSync() {
    if (db)
        return db;
    if (!dbReady) {
        dbReady = initDb();
    }
    await dbReady;
    return db;
}
function closeDatabase() {
    if (db) {
        saveDatabase();
        db.close();
        db = null;
    }
}
async function getAllModelConfigs() {
    const database = await getDatabase();
    const results = database.exec('SELECT * FROM model_configs ORDER BY is_active DESC, updated_at DESC');
    if (results.length === 0)
        return [];
    const columns = results[0].columns;
    return results[0].values.map(row => {
        const obj = {};
        columns.forEach((col, i) => {
            obj[col] = row[i];
        });
        return obj;
    });
}
async function getModelConfigById(id) {
    const database = await getDatabase();
    const stmt = database.prepare('SELECT * FROM model_configs WHERE id = ?');
    stmt.bind([id]);
    if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
    }
    stmt.free();
    return null;
}
async function getActiveModelConfig() {
    const database = await getDatabase();
    const results = database.exec('SELECT * FROM model_configs WHERE is_active = 1 LIMIT 1');
    if (results.length === 0 || results[0].values.length === 0)
        return null;
    const columns = results[0].columns;
    const row = results[0].values[0];
    const obj = {};
    columns.forEach((col, i) => {
        obj[col] = row[i];
    });
    return obj;
}
async function saveModelConfig(config) {
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
    const id = result[0].values[0][0];
    saveDatabase();
    return id;
}
async function updateModelConfig(id, config) {
    const database = await getDatabase();
    const fields = [];
    const values = [];
    if (config.name !== undefined) {
        fields.push('name = ?');
        values.push(config.name);
    }
    if (config.provider !== undefined) {
        fields.push('provider = ?');
        values.push(config.provider);
    }
    if (config.model !== undefined) {
        fields.push('model = ?');
        values.push(config.model);
    }
    if (config.api_key !== undefined) {
        fields.push('api_key = ?');
        values.push(config.api_key);
    }
    if (config.endpoint !== undefined) {
        fields.push('endpoint = ?');
        values.push(config.endpoint);
    }
    if (config.use_proxy !== undefined) {
        fields.push('use_proxy = ?');
        values.push(config.use_proxy);
    }
    if (config.proxy_endpoint !== undefined) {
        fields.push('proxy_endpoint = ?');
        values.push(config.proxy_endpoint);
    }
    if (config.category !== undefined) {
        fields.push('category = ?');
        values.push(config.category);
    }
    if (config.capabilities !== undefined) {
        fields.push('capabilities = ?');
        values.push(config.capabilities);
    }
    if (config.is_active !== undefined) {
        fields.push('is_active = ?');
        values.push(config.is_active);
    }
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    database.run(`UPDATE model_configs SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();
}
async function deleteModelConfig(id) {
    const database = await getDatabase();
    database.run('DELETE FROM model_configs WHERE id = ?', [id]);
    saveDatabase();
}
async function setActiveModelConfig(id) {
    const database = await getDatabase();
    database.run('UPDATE model_configs SET is_active = 0');
    database.run('UPDATE model_configs SET is_active = 1 WHERE id = ?', [id]);
    saveDatabase();
}
// App Settings Operations
async function getAppSetting(key) {
    const database = await getDatabase();
    const stmt = database.prepare('SELECT value FROM app_settings WHERE key = ?');
    stmt.bind([key]);
    if (stmt.step()) {
        const result = stmt.get()[0];
        stmt.free();
        return result;
    }
    stmt.free();
    return null;
}
async function setAppSetting(key, value) {
    const database = await getDatabase();
    database.run(`
    INSERT OR REPLACE INTO app_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `, [key, value]);
    saveDatabase();
}
async function getAllConversations(page = 1, pageSize = 20) {
    const database = await getDatabase();
    const offset = (page - 1) * pageSize;
    const countResult = database.exec('SELECT COUNT(*) as total FROM conversations');
    const total = countResult.length > 0 ? countResult[0].values[0][0] : 0;
    const results = database.exec('SELECT * FROM conversations ORDER BY updated_at DESC LIMIT ? OFFSET ?', [pageSize, offset]);
    if (results.length === 0)
        return { conversations: [], total };
    const columns = results[0].columns;
    const conversations = results[0].values.map(row => {
        const obj = {};
        columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
    });
    return { conversations, total };
}
async function getConversationById(id) {
    const database = await getDatabase();
    const stmt = database.prepare('SELECT * FROM conversations WHERE id = ?');
    stmt.bind([id]);
    if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
    }
    stmt.free();
    return null;
}
async function createConversation(data) {
    const database = await getDatabase();
    database.run('INSERT INTO conversations (title, model_provider, model_name, system_prompt) VALUES (?, ?, ?, ?)', [data.title || '新对话', data.model_provider, data.model_name, data.system_prompt || null]);
    const result = database.exec('SELECT last_insert_rowid() as id');
    const id = result[0].values[0][0];
    saveDatabase();
    return id;
}
async function updateConversation(id, data) {
    const database = await getDatabase();
    const fields = [];
    const values = [];
    if (data.title !== undefined) {
        fields.push('title = ?');
        values.push(data.title);
    }
    if (data.system_prompt !== undefined) {
        fields.push('system_prompt = ?');
        values.push(data.system_prompt);
    }
    if (data.summary !== undefined) {
        fields.push('summary = ?');
        values.push(data.summary);
    }
    if (data.summary_updated_at !== undefined) {
        fields.push('summary_updated_at = ?');
        values.push(data.summary_updated_at);
    }
    if (data.message_count !== undefined) {
        fields.push('message_count = ?');
        values.push(data.message_count);
    }
    if (data.is_archived !== undefined) {
        fields.push('is_archived = ?');
        values.push(data.is_archived);
    }
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    database.run(`UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();
}
async function deleteConversation(id) {
    const database = await getDatabase();
    database.run('DELETE FROM conversations WHERE id = ?', [id]);
    saveDatabase();
}
async function getMessagesByConversationId(conversationId) {
    const database = await getDatabase();
    const results = database.exec('SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC', [conversationId]);
    if (results.length === 0)
        return [];
    const columns = results[0].columns;
    return results[0].values.map(row => {
        const obj = {};
        columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
    });
}
async function createMessage(data) {
    const database = await getDatabase();
    database.run('INSERT INTO chat_messages (conversation_id, role, content, token_usage, attachments) VALUES (?, ?, ?, ?, ?)', [data.conversation_id, data.role, data.content, data.token_usage || 0, data.attachments || null]);
    // 更新对话的 message_count 和 updated_at
    database.run('UPDATE conversations SET message_count = message_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [data.conversation_id]);
    const result = database.exec('SELECT last_insert_rowid() as id');
    const id = result[0].values[0][0];
    saveDatabase();
    return id;
}
async function getMessageCount(conversationId) {
    const database = await getDatabase();
    const result = database.exec('SELECT COUNT(*) as count FROM chat_messages WHERE conversation_id = ?', [conversationId]);
    return result.length > 0 ? result[0].values[0][0] : 0;
}
//# sourceMappingURL=database.js.map