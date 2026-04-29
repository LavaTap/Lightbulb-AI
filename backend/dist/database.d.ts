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
//# sourceMappingURL=database.d.ts.map