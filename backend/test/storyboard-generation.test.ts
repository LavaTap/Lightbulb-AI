/**
 * 分镜生图测试用例
 *
 * 使用说明：
 * 1. 配置你的 API Key 在下面 HUNYUAN_CONFIG 中
 * 2. 运行: npx tsx test/storyboard-generation.test.ts
 * 3. 会自动测试 人物图+场景图+分镜提示词 -> 混元 3.0 -> 生成九宫格分镜
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

// 图片路径（根目录下的测试图片）
const TEST_IMAGES_DIR = path.resolve(process.cwd(), '..'); // 根目录
const IMAGE_PATHS = [
  path.join(TEST_IMAGES_DIR, '人物图1.jpg'),
  path.join(TEST_IMAGES_DIR, '人物图2.jpg'),
  path.join(TEST_IMAGES_DIR, '场景图.png'),
];

// 分镜提示词路径
const PROMPT_PATH = path.join(TEST_IMAGES_DIR, '分镜测试文本.txt');

async function loadImageAsBase64(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  return buffer.toString('base64');
}

async function loadPrompt(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf-8');
  // 提取生成结果部分的提示词
  const lines = content.split('\n');
  const promptStartIndex = lines.findIndex(line => line.includes('【生成结果】'));
  if (promptStartIndex !== -1) {
    return lines.slice(promptStartIndex + 1).join('\n').trim();
  }
  return content.trim();
}

async function testStoryboardGeneration() {
  console.log('\n========== 分镜生图测试 ==========');
  console.log('[Provider]', HUNYUAN_CONFIG.provider);
  console.log('[Model]', HUNYUAN_CONFIG.model);
  console.log('[Endpoint]', HUNYUAN_CONFIG.endpoint);
  console.log('==================================\n');

  if (HUNYUAN_CONFIG.apiKey === 'YOUR_API_KEY_HERE') {
    console.error('❌ 请先在测试文件中配置你的 API Key！');
    console.error('文件位置: backend/test/storyboard-generation.test.ts');
    process.exit(1);
  }

  try {
    // 加载测试资源
    console.log('🔄 正在加载测试图片和提示词...');
    const [prompt, ...images] = await Promise.all([
      loadPrompt(PROMPT_PATH),
      ...IMAGE_PATHS.map(loadImageAsBase64),
    ]);

    console.log(`✅ 加载完成: ${images.length}张图片, 提示词长度: ${prompt.length}字符`);
    console.log(`📐 输出尺寸: 16:9 (非正方形)`);

    const startTime = Date.now();

    // 调用生成接口
    const result = await generateImage(
      prompt,
      HUNYUAN_CONFIG,
      '16:9', // 16:9 非正方形尺寸
      images // 多张参考图：2个人物+1个场景
    );

    const duration = Date.now() - startTime;

    console.log('\n✅ 分镜生成成功！');
    console.log('==========================================');
    console.log('[Token Usage]', result.tokenUsage);
    console.log('[Image Size]', (result.imageBase64.length / 1024).toFixed(2), 'KB');
    console.log('[Duration]', (duration / 1000).toFixed(2), 'seconds');
    console.log('==========================================\n');

    // 保存结果图片
    const outputPath = path.join(process.cwd(), 'storyboard-test-output.png');
    await fs.writeFile(outputPath, Buffer.from(result.imageBase64, 'base64'));
    console.log('🖼️  图片已保存到:', outputPath);

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ 分镜生成失败！');
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
testStoryboardGeneration().catch(console.error);
