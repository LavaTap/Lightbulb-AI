/**
 * 文生图测试用例
 *
 * 使用说明：
 * 1. 配置你的 API Key 在下面 HUNYUAN_CONFIG 中
 * 2. 运行: npx tsx test/text-to-image.test.ts
 * 3. 会自动测试 文本提示词 -> 混元 3.0 -> 生成单张图片
 */

import { generateImage } from '../src/services/imageGenService.js';
import type { APIConfig } from '../src/types/index.js';
import fs from 'fs/promises';
import path from 'path';

// ========== 自动从数据库加载的混元配置 ==========
const HUNYUAN_CONFIG: APIConfig = {
  provider: 'tencent',
  model: 'hy-image-v3.0',        // 混元3.0模型
  apiKey: 'ak-20260511-b92c9caa6333af29d4eda57c745a12e6:sk-3DRvEe2L2fYHNZAwpuBMy7QjtVCxxWdDqRRZWnIIHWATg6C1', // 从数据库读取
  endpoint: 'https://api.cloudai.tencent.com/v1/aiart/submit', // 使用腾讯云官方端点
  useProxy: false,
  proxyEndpoint: '',
};
// =================================================

// 测试提示词
const TEST_PROMPT = '泳装美少女，高清，写实风格，海边背景，阳光明媚，8K分辨率';

// 测试尺寸：16:9（非正方形，符合要求）
const TEST_SIZE = '16:9';

async function testTextToImage() {
  console.log('\n========== 文生图测试 ==========');
  console.log('[Provider]', HUNYUAN_CONFIG.provider);
  console.log('[Model]', HUNYUAN_CONFIG.model);
  console.log('[Endpoint]', HUNYUAN_CONFIG.endpoint);
  console.log('[Prompt]', TEST_PROMPT);
  console.log('[Size]', TEST_SIZE);
  console.log('==================================\n');

  if (HUNYUAN_CONFIG.apiKey === 'YOUR_API_KEY_HERE') {
    console.error('❌ 请先在测试文件中配置你的 API Key！');
    console.error('文件位置: backend/test/text-to-image.test.ts');
    process.exit(1);
  }

  try {
    const startTime = Date.now();

    // 调用生成接口
    const result = await generateImage(
      TEST_PROMPT,
      HUNYUAN_CONFIG,
      TEST_SIZE // 16:9 非正方形尺寸
    );

    const duration = Date.now() - startTime;

    console.log('\n✅ 文生图生成成功！');
    console.log('==========================================');
    console.log('[Token Usage]', result.tokenUsage);
    console.log('[Image Size]', (result.imageBase64.length / 1024).toFixed(2), 'KB');
    console.log('[Duration]', (duration / 1000).toFixed(2), 'seconds');
    console.log('==========================================\n');

    // 保存结果图片
    const outputPath = path.join(process.cwd(), 'text-to-image-test-output.png');
    await fs.writeFile(outputPath, Buffer.from(result.imageBase64, 'base64'));
    console.log('🖼️  图片已保存到:', outputPath);

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ 文生图生成失败！');
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
testTextToImage().catch(console.error);
