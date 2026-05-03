import type { APIConfig } from '../types/index.js';
export declare function generatePoster(images: string[], prompt: string, config: APIConfig, size?: '1024x1024' | '1024x1792' | '1792x1024'): Promise<{
    imageBase64: string;
    tokenUsage: number;
}>;
//# sourceMappingURL=posterService.d.ts.map