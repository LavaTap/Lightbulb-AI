import { analyzeImage } from './visionService.js';
import { generateImage } from './imageGenService.js';
import type { APIConfig } from '../types/index.js';

export async function generatePoster(
  images: string[],
  prompt: string,
  config: APIConfig,
  size: '1024x1024' | '1024x1792' | '1792x1024' = '1792x1024'
): Promise<{ imageBase64: string; tokenUsage: number }> {
  console.log('\n========== Poster Generation Start ==========');
  console.log('[Reference Images]', images.length);
  console.log('[User Prompt]', prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''));
  console.log('[Provider]', config.provider);
  console.log('============================================\n');

  // Analyze the first reference image for style
  const firstImage = images[0];
  const { result: analysis } = await analyzeImage(firstImage, config);
  
  console.log('[Extracted Style]', analysis.analysis.zh);
  
  // Combine user prompt with extracted style
  const enhancedPrompt = `Poster design: ${prompt}. 
Style: ${analysis.analysis.en}.`;
  
  console.log('[Enhanced Prompt]', enhancedPrompt.substring(0, 200) + '...\n');

  // Generate the poster
  const { imageBase64, tokenUsage } = await generateImage(
    enhancedPrompt,
    config,
    size
  );
  
  console.log('\n========== Poster Generation Complete ==========');
  console.log('[Total Image Size]', (imageBase64.length / 1024).toFixed(2), 'KB');
  console.log('[Estimated Tokens]', tokenUsage);
  console.log('==============================================\n');

  return {
    imageBase64,
    tokenUsage
  };
}
