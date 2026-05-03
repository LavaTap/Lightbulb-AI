import type { APIConfig } from '../types/index.js';
export type ImageSize = '1024x1024' | '1024x1792' | '1792x1024' | '2560x1440';
export declare function generateImage(prompt: string, config: APIConfig, size?: ImageSize, referenceImage?: string): Promise<{
    imageBase64: string;
    tokenUsage: number;
}>;
//# sourceMappingURL=imageGenService.d.ts.map