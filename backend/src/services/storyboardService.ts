import { analyzeImage } from './visionService.js';
import { generateImage } from './imageGenService.js';
import type { APIConfig } from '../types/index.js';

export async function generateStoryboard(
  characterImages: string[],
  sceneImage: string | undefined,
  userPrompt: string,
  config: APIConfig
): Promise<{ imageBase64: string; tokenUsage: number }> {
  console.log('\n========== Storyboard Generation Start ==========');
  console.log('[Character Images]', characterImages.length);
  console.log('[Has Scene Image]', !!sceneImage);
  console.log('[Provider]', config.provider);
  console.log('================================================\n');

  // Analyze each character reference image
  let characterAnalysis = '';
  let totalTokenUsage = 0;

  if (characterImages.length > 0) {
    for (let i = 0; i < characterImages.length; i++) {
      const { result: analysis, tokenUsage } = await analyzeImage(characterImages[i], config);
      characterAnalysis += `\nCharacter ${i + 1} features: ${analysis.analysis.en}`;
      totalTokenUsage += tokenUsage;
      console.log(`[Character ${i + 1} Analysis]`, analysis.analysis.zh.substring(0, 100) + (analysis.analysis.zh.length > 100 ? '...' : ''));
    }
  }

  // Analyze scene reference image if provided
  let sceneAnalysis = '';
  if (sceneImage) {
    const { result: analysis, tokenUsage } = await analyzeImage(sceneImage, config);
    sceneAnalysis = `\nScene features: ${analysis.analysis.en}`;
    totalTokenUsage += tokenUsage;
    console.log('[Scene Analysis]', analysis.analysis.zh.substring(0, 100) + (analysis.analysis.zh.length > 100 ? '...' : ''));
  }

  // Build the complete prompt with all rules
  const finalPrompt = `
Create a 16:9 ratio 3×3 nine-grid storyboard that fully depicts a complete battle between two characters.

User Settings:
${userPrompt}
${characterAnalysis}
${sceneAnalysis}

You MUST strictly follow these rules:

1. LAYOUT REQUIREMENTS:
- The entire image must be strictly arranged in a 3 rows × 3 columns grid with exactly 9 panels.
- The 9 panels must be strictly ordered numerically from 1 to 9: first row left to right 1-3, second row 4-6, third row 7-9.
- Separate panels with a 2px thin white line between each grid.
- Each panel MUST have its corresponding number 1-9 clearly labeled in black text at the bottom-left corner.
- DO NOT add any extra text, watermarks, decorative elements, or signatures anywhere on the image.

2. CAMERA ANGLE REQUIREMENTS:
- All 9 camera angles MUST be completely different (no repeats).
- MUST include these angles: high-angle overhead wide shot, close-up shot, medium-wide shot, side-profile shot, medium close-up shot.
- The remaining four panels MUST use different additional angles to ensure all 9 are unique.

3. NARRATIVE REQUIREMENTS:
- The 9 panels must tell a complete 9-panel narrative sequence from initial confrontation, through exchanged blows, to final outcome:
  Panel 1 = Opening confrontation
  Panels 2-8 = Progressive escalating battle
  Panel 9 = Final result with winner and loser
- Follow the battle process described by the user to depict the complete sequence.
- Connect panels with smooth fast-paced action transitions.

4. CHARACTER CONSISTENCY REQUIREMENTS:
- Strictly preserve each character's facial features, hairstyle, clothing color and texture, light and shadow texture from reference images.
- Keep each character's signature weapons, special ability visual effects, and physical features consistent.
- Maintain character consistency across all 9 panels - the same character must look identical in every panel.
- Characters maintain their stated posture throughout (flying/floating/standing).

5. ENVIRONMENT CONSISTENCY REQUIREMENTS:
- Lock in the specified weather, atmosphere, and scene mood throughout all 9 panels.
- Recreate all buildings, landforms, and landmarks from the reference scene.
- Maintain consistent scene lighting and atmosphere across all 9 panels.

Generate a complete 16:9 nine-grid storyboard image.
`.trim();

  console.log('\n[Final Prompt Length]', finalPrompt.length, 'characters');
  console.log('[Accumulated Tokens from Analysis]', totalTokenUsage);
  console.log('\nGenerating image...\n');

  // Generate the final storyboard at 2560x1440 (16:9)
  const { imageBase64, tokenUsage } = await generateImage(
    finalPrompt,
    config,
    '2560x1440',
    characterImages.length > 0 ? characterImages[0] : undefined
  );

  totalTokenUsage += tokenUsage;

  console.log('\n========== Storyboard Generation Complete ==========');
  console.log('[Total Image Size]', (imageBase64.length / 1024).toFixed(2), 'KB');
  console.log('[Total Tokens]', totalTokenUsage);
  console.log('==================================================\n');

  return {
    imageBase64,
    tokenUsage: totalTokenUsage,
  };
}
