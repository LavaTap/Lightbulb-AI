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
    saveDatabase();
    const result = database.exec('SELECT last_insert_rowid() as id');
    return result[0].values[0][0];
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
//# sourceMappingURL=database.js.map