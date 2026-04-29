import type { APIConfig, VisionAnalysisResult } from '../types/index.js';
import type { AnalysisCategory } from '../middleware/validateRequest.js';
export declare function analyzeImage(imageBase64: string, config: APIConfig, category?: AnalysisCategory): Promise<{
    result: VisionAnalysisResult;
    tokenUsage: number;
}>;
//# sourceMappingURL=visionService.d.ts.map