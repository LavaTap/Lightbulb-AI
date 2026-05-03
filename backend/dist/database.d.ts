import { Database as SqlJsDatabase } from 'sql.js';
export declare function saveDatabase(): void;
export declare function getDatabase(): Promise<SqlJsDatabase>;
export declare function getDatabaseSync(): Promise<SqlJsDatabase>;
export declare function closeDatabase(): void;
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
export declare function getAllModelConfigs(): Promise<ModelConfigRow[]>;
export declare function getModelConfigById(id: number): Promise<ModelConfigRow | null>;
export declare function getActiveModelConfig(): Promise<ModelConfigRow | null>;
export declare function saveModelConfig(config: Omit<ModelConfigRow, 'id' | 'created_at' | 'updated_at'>): Promise<number>;
export declare function updateModelConfig(id: number, config: Partial<ModelConfigRow>): Promise<void>;
export declare function deleteModelConfig(id: number): Promise<void>;
export declare function setActiveModelConfig(id: number): Promise<void>;
export declare function getAppSetting(key: string): Promise<string | null>;
export declare function setAppSetting(key: string, value: string): Promise<void>;
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
    created_at: string;
}
export declare function getAllConversations(page?: number, pageSize?: number): Promise<{
    conversations: ConversationRow[];
    total: number;
}>;
export declare function getConversationById(id: number): Promise<ConversationRow | null>;
export declare function createConversation(data: {
    title?: string;
    model_provider: string;
    model_name: string;
    system_prompt?: string;
}): Promise<number>;
export declare function updateConversation(id: number, data: Partial<Pick<ConversationRow, 'title' | 'system_prompt' | 'summary' | 'summary_updated_at' | 'message_count' | 'is_archived'>>): Promise<void>;
export declare function deleteConversation(id: number): Promise<void>;
export declare function getMessagesByConversationId(conversationId: number): Promise<ChatMessageRow[]>;
export declare function createMessage(data: {
    conversation_id: number;
    role: 'system' | 'user' | 'assistant';
    content: string;
    token_usage?: number;
}): Promise<number>;
export declare function getMessageCount(conversationId: number): Promise<number>;
//# sourceMappingURL=database.d.ts.map