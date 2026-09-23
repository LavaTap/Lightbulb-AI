import * as lancedb from '@lancedb/lancedb';
import { generateEmbedding, getEmbeddingConfig } from './embeddingService.js';
import type { APIConfig } from '../types/index.js';

const LANCEDB_DIR = process.env.LANCEDB_DIR || 'data/lancedb';
const COLLECTION_NAME = 'lightbulb_memories';

let db: lancedb.Connection | null = null;
let table: lancedb.Table | null = null;
let available = false;

export async function initLance(): Promise<void> {
  try {
    db = await lancedb.connect(LANCEDB_DIR);

    // 尝试打开已存在的表
    const tables = await db.tableNames();
    if (tables.includes(COLLECTION_NAME)) {
      table = await db.openTable(COLLECTION_NAME);
    }
    // db 连接成功即标记可用，表通过 ensureTable 在首次写入时延迟创建
    available = true;
    console.log(table
      ? '[LanceService] LanceDB connected, table opened, memory features enabled'
      : '[LanceService] LanceDB connected, table will be created on first memory write');
  } catch (error) {
    // LanceDB 是可选的，仅在 AI 对话中用于记忆功能，不影响其他功能
    available = false;
    db = null;
    table = null;
    console.warn('[LanceService] LanceDB initialization failed, memory features disabled:', (error as Error).message);
  }
}

export function isLanceAvailable(): boolean {
  return available;
}

async function ensureTable(record: Record<string, unknown>): Promise<void> {
  if (!db) {
    throw new Error('LanceDB not initialized');
  }
  if (!table) {
    table = await db.createTable(COLLECTION_NAME, [record]);
    available = true;
    console.log('[LanceService] Table created with first record');
  }
}

export async function storeMemory(params: {
  conversationId: number;
  content: string;
  type: 'summary' | 'fact';
  metadata?: Record<string, string>;
  config?: APIConfig;
}): Promise<void> {
  if (!db) return;

  try {
    const embeddingConfig = params.config || await getEmbeddingConfig();
    if (!embeddingConfig) {
      console.warn('[LanceService] No embedding config available, skipping memory storage');
      return;
    }

    const embedding = await generateEmbedding(params.content, embeddingConfig);
    const record = {
      vector: new Float32Array(embedding),
      content: params.content,
      conversation_id: String(params.conversationId),
      type: params.type,
      created_at: new Date().toISOString(),
      ...params.metadata,
    };

    await ensureTable(record);

    if (table) {
      await table.add([record]);
      console.log(`[LanceService] Stored ${params.type} memory for conversation ${params.conversationId}`);
    }
  } catch (error) {
    console.warn('[LanceService] Failed to store memory:', (error as Error).message);
  }
}

export async function retrieveMemories(params: {
  query: string;
  nResults?: number;
  conversationId?: number;
  config?: APIConfig;
}): Promise<Array<{ content: string; metadata: Record<string, string>; distance: number }>> {
  if (!available || !table) return [];

  try {
    const embeddingConfig = params.config || await getEmbeddingConfig();
    if (!embeddingConfig) return [];

    const queryEmbedding = await generateEmbedding(params.query, embeddingConfig);
    const nResults = params.nResults || 5;

    let queryBuilder = table
      .query()
      .nearestTo(new Float32Array(queryEmbedding))
      .limit(nResults);

    if (params.conversationId) {
      queryBuilder = queryBuilder.where(`conversation_id = "${params.conversationId}"`);
    }

    const results = await queryBuilder.toArray();

    if (!results || results.length === 0) return [];

    return results.map((row: any) => ({
      content: row.content || '',
      metadata: {
        conversation_id: row.conversation_id || '',
        type: row.type || '',
        created_at: row.created_at || '',
      },
      distance: row._distance ?? 0,
    }));
  } catch (error) {
    console.warn('[LanceService] Failed to retrieve memories:', (error as Error).message);
    return [];
  }
}

export async function deleteConversationMemories(conversationId: number): Promise<void> {
  if (!available || !table) return;

  try {
    await table.delete(`conversation_id = "${conversationId}"`);
    console.log(`[LanceService] Deleted memories for conversation ${conversationId}`);
  } catch (error) {
    console.warn('[LanceService] Failed to delete conversation memories:', (error as Error).message);
  }
}
