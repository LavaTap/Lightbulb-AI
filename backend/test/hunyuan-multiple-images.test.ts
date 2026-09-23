/**
 * 腾讯混元多张参考图生成九宫格分镜测试
 *
 * 使用说明：
 * 1. 配置你的 API Key 在下面 HUNYUAN_CONFIG 中
 * 2. 运行: npx tsx test/hunyuan-multiple-images.test.ts
 * 3. 会自动测试 多张参考图 -> 混元 3.0 -> 生成九宫格分镜
 */

import { generateImage } from '../src/services/imageGenService.js';
import type { APIConfig } from '../src/types/index.js';

// ========== 请在这里配置你的混元信息 ==========
const HUNYUAN_CONFIG: APIConfig = {
  provider: 'tencent',
  model: 'hy3-preview',           // 或者 'hy-image-v3.0'
  apiKey: 'YOUR_API_KEY_HERE',    // TokenHub 的 API Key，或者腾讯云格式: SecretId:SecretKey
  endpoint: 'https://tokenhub.tencentmaas.com/v1/api/image',
  useProxy: false,
  proxyEndpoint: '',
};
// =================================================

// 测试用的提示词 - 九宫格分镜提示
const NINE_GRID_PROMPT = `Create a 16:9 ratio 3×3 nine-grid storyboard that fully depicts a complete battle between two characters.

User Settings:
题材设定：超级英雄都市对战
人物能力：主角操控雷电飞行，反派力量型近战
对战逻辑：开局空中对峙→电光突进→近身肉搏→大招对轰→主角险胜
环境氛围：夜晚赛博朋克城市，霓虹灯蓝紫调，暴雨闪电

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

// 模拟参考图 - 使用一个极小的透明 PNG base64
// 在实际使用中，这里应该替换为你的真实参考图 base64
const MOCK_REF_IMAGE = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// 如果有多个参考图，在这里添加
// 例如：角色1, 角色2, 场景
const TEST_REFERENCE_IMAGES: string[] = [
  MOCK_REF_IMAGE,
  // 添加第二个参考图: MOCK_REF_IMAGE_2,
  // 添加场景参考图: MOCK_REF_IMAGE_3,
];

async function testHunyuanMultipleImages() {
  console.log('\n========== 腾讯混元多张参考图测试 ==========');
  console.log('[Provider]', HUNYUAN_CONFIG.provider);
  console.log('[Model]', HUNYUAN_CONFIG.model);
  console.log('[Endpoint]', HUNYUAN_CONFIG.endpoint);
  console.log('[Reference Images]', TEST_REFERENCE_IMAGES.length);
  console.log('[Prompt Length]', NINE_GRID_PROMPT.length);
  console.log('==========================================\n');

  if (HUNYUAN_CONFIG.apiKey === 'YOUR_API_KEY_HERE') {
    console.error('❌ 请先在测试文件中配置你的 API Key！');
    console.error('文件位置: backend/test/hunyuan-multiple-images.test.ts');
    process.exit(1);
  }

  if (TEST_REFERENCE_IMAGES.length === 0) {
    console.warn('⚠️  没有提供参考图，将只进行纯文本生成测试');
  }

  try {
    const startTime = Date.now();

    const reference = TEST_REFERENCE_IMAGES.length === 0
      ? undefined
      : TEST_REFERENCE_IMAGES.length === 1
        ? TEST_REFERENCE_IMAGES[0]
        : TEST_REFERENCE_IMAGES;

    const result = await generateImage(
      NINE_GRID_PROMPT,
      HUNYUAN_CONFIG,
      '2560x1440',
      reference
    );

    const duration = Date.now() - startTime;

    console.log('\n✅ 生成成功！');
    console.log('==========================================');
    console.log('[Token Usage]', result.tokenUsage);
    console.log('[Image Size]', (result.imageBase64.length / 1024).toFixed(2), 'KB');
    console.log('[Duration]', (duration / 1000).toFixed(2), 'seconds');
    console.log('==========================================\n');

    // 输出结果，可以保存到文件
    const fs = await import('fs');
    fs.writeFileSync('hunyuan-test-output.png', Buffer.from(result.imageBase64, 'base64'));
    console.log('🖼️  图片已保存到: hunyuan-test-output.png');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ 生成失败！');
    console.error('==========================================');
    console.error('[Error]', error.message);
    if (error.stack) {
      console.error('\n[Stack]', error.stack);
    }
    console.error('==========================================\n');
    process.exit(1);
  }
}

// 运行测试
testHunyuanMultipleImages().catch(console.error);
