import { ChromaClient } from 'chromadb';
import { generateEmbedding, getEmbeddingConfig, EMBEDDING_DIMENSION } from './embeddingService.js';
import type { APIConfig } from '../types/index.js';

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const COLLECTION_NAME = 'lightbulb_memories';

let client: ChromaClient | null = null;
let collection: any = null;
let available = false;

export async function initChroma(): Promise<void> {
  try {
    console.log('[ChromaService] Connecting to ChromaDB at', CHROMA_URL);
    client = new ChromaClient({ path: CHROMA_URL });

    // 测试连接
    await client.heartbeat();

    // 获取或创建集合
    try {
      collection = await client.getCollection({ name: COLLECTION_NAME });
    } catch {
      collection = await client.createCollection({
        name: COLLECTION_NAME,
        metadata: { 'hnsw:space': 'cosine', dimension: String(EMBEDDING_DIMENSION) },
      });
    }

    available = true;
    console.log('[ChromaService] ChromaDB connected, collection ready');
  } catch (error) {
    console.warn('[ChromaService] ChromaDB not available, memory features disabled:', (error as Error).message);
    available = false;
    client = null;
    collection = null;
  }
}

export function isChromaAvailable(): boolean {
  return available;
}

export async function storeMemory(params: {
  conversationId: number;
  content: string;
  type: 'summary' | 'fact';
  metadata?: Record<string, string>;
  config?: APIConfig;
}): Promise<void> {
  if (!available || !collection) return;

  try {
    const embeddingConfig = params.config || await getEmbeddingConfig();
    if (!embeddingConfig) {
      console.warn('[ChromaService] No embedding config available, skipping memory storage');
      return;
    }

    const embedding = await generateEmbedding(params.content, embeddingConfig);
    const id = `conv_${params.conversationId}_${params.type}_${Date.now()}`;

    await collection.add({
      ids: [id],
      embeddings: [embedding],
      documents: [params.content],
      metadatas: [{
        conversation_id: String(params.conversationId),
        type: params.type,
        created_at: new Date().toISOString(),
        ...params.metadata,
      }],
    });

    console.log(`[ChromaService] Stored ${params.type} memory for conversation ${params.conversationId}`);
  } catch (error) {
    console.warn('[ChromaService] Failed to store memory:', (error as Error).message);
  }
}

export async function retrieveMemories(params: {
  query: string;
  nResults?: number;
  conversationId?: number;
  config?: APIConfig;
}): Promise<Array<{ content: string; metadata: Record<string, string>; distance: number }>> {
  if (!available || !collection) return [];

  try {
    const embeddingConfig = params.config || await getEmbeddingConfig();
    if (!embeddingConfig) return [];

    const queryEmbedding = await generateEmbedding(params.query, embeddingConfig);
    const nResults = params.nResults || 5;

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults,
      where: params.conversationId
        ? { conversation_id: String(params.conversationId) }
        : undefined,
    });

    if (!results.documents || !results.documents[0]) return [];

    return results.documents[0].map((doc: any, i: number) => ({
      content: doc || '',
      metadata: (results.metadatas?.[0]?.[i] as Record<string, string>) || {},
      distance: results.distances?.[0]?.[i] ?? 0,
    }));
  } catch (error) {
    console.warn('[ChromaService] Failed to retrieve memories:', (error as Error).message);
    return [];
  }
}

export async function deleteConversationMemories(conversationId: number): Promise<void> {
  if (!available || !collection) return;

  try {
    await collection.delete({
      where: { conversation_id: String(conversationId) },
    });
    console.log(`[ChromaService] Deleted memories for conversation ${conversationId}`);
  } catch (error) {
    console.warn('[ChromaService] Failed to delete conversation memories:', (error as Error).message);
  }
}
