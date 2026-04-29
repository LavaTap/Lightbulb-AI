import type { APIConfig } from '../types/index.js';
export declare function generateImage(prompt: string, config: APIConfig, size?: '1024x1024' | '1024x1792' | '1792x1024', referenceImage?: string): Promise<{
    imageBase64: string;
    tokenUsage: number;
}>;
//# sourceMappingURL=imageGenService.d.ts.map