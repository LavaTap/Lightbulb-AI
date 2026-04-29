"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePoster = generatePoster;
const visionService_js_1 = require("./visionService.js");
const imageGenService_js_1 = require("./imageGenService.js");
async function generatePoster(images, prompt, config) {
    console.log('\n========== Poster Generation Start ==========');
    console.log('[Reference Images]', images.length);
    console.log('[User Prompt]', prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''));
    console.log('[Provider]', config.provider);
    console.log('============================================\n');
    // Analyze the first reference image for style
    const firstImage = images[0];
    const { result: analysis } = await (0, visionService_js_1.analyzeImage)(firstImage, config);
    console.log('[Extracted Style]', analysis.analysis.zh);
    // Combine user prompt with extracted style
    const enhancedPrompt = `Poster design: ${prompt}. 
Style: ${analysis.analysis.en}.`;
    console.log('[Enhanced Prompt]', enhancedPrompt.substring(0, 200) + '...\n');
    // Generate the poster
    const { imageBase64, tokenUsage } = await (0, imageGenService_js_1.generateImage)(enhancedPrompt, config, '1792x1024');
    console.log('\n========== Poster Generation Complete ==========');
    console.log('[Total Image Size]', (imageBase64.length / 1024).toFixed(2), 'KB');
    console.log('[Estimated Tokens]', tokenUsage);
    console.log('==============================================\n');
    return {
        imageBase64,
        tokenUsage
    };
}
//# sourceMappingURL=posterService.js.map