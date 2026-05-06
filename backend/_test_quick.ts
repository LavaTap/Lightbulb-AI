import { getDatabase, getAllModelConfigs } from './src/database.js';
import { initLance, isLanceAvailable, storeMemory } from './src/services/lanceService.js';
import { getEmbeddingConfig, generateEmbedding } from './src/services/embeddingService.js';
import { chatCompletion } from './src/services/chatService.js';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult { step: number; name: string; pass: boolean; info: string }

async function main() {
  const results: TestResult[] = [];

  // Step 1: LanceDB 连通性 + 数据目录
  try {
    await getDatabase();
    await initLance();
    const available = isLanceAvailable();
    const lanceDir = path.resolve('data/lancedb');
    const dirExists = fs.existsSync(lanceDir);
    const tableExists = fs.existsSync(path.join(lanceDir, 'lightbulb_memories.lance'));
    results.push({
      step: 1, name: 'LanceDB 连通性', pass: available,
      info: (available ? '已连接' : '不可用') + ' | 目录:' + dirExists + ' 表:' + tableExists
    });
  } catch (e: any) {
    results.push({ step: 1, name: 'LanceDB 连通性', pass: false, info: e.message });
  }

  if (!results[0].pass) { console.log(JSON.stringify(results)); return; }

  // Step 2: 嵌入生成
  try {
    const config = await getEmbeddingConfig();
    if (!config) {
      results.push({ step: 2, name: '嵌入生成', pass: false, info: 'No embedding config' });
    } else {
      const embedding = await generateEmbedding('测试文本');
      results.push({ step: 2, name: '嵌入生成', pass: true, info: `${config.provider} ${config.model} ${embedding.length}d` });
    }
  } catch (e: any) {
    results.push({ step: 2, name: '嵌入生成', pass: false, info: e.message });
  }

  // Step 3: AI 连接测试
  try {
    const configs = await getAllModelConfigs();
    const textConfig = configs.find((c: any) => c.api_key && (c.category?.includes('text') || c.category === 'text'));
    if (!textConfig) {
      results.push({ step: 3, name: 'AI 连接', pass: false, info: 'No text model config' });
    } else {
      const config = {
        provider: textConfig.provider,
        model: textConfig.model,
        endpoint: textConfig.endpoint || '',
        apiKey: textConfig.api_key!,
        useProxy: !!textConfig.use_proxy,
        proxyEndpoint: textConfig.proxy_endpoint || '',
      };
      const result = await chatCompletion(
        [{ role: 'user', content: '回复"连接正常"四个字' }],
        config,
        { maxTokens: 20, temperature: 0 }
      );
      results.push({
        step: 3, name: 'AI 连接', pass: true,
        info: `${config.provider}/${config.model} 响应:${result.content.substring(0, 20)} token:${result.tokenUsage}`
      });
    }
  } catch (e: any) {
    results.push({ step: 3, name: 'AI 连接', pass: false, info: e.message });
  }

  // Step 4: 记忆存储
  try {
    await storeMemory({ conversationId: 99999, content: '测试记忆-用户喜欢水彩画', type: 'fact' });
    await storeMemory({ conversationId: 99999, content: '测试记忆-用户是插画师', type: 'fact' });
    await storeMemory({ conversationId: 99999, content: '测试摘要-这是一个关于绘画的对话', type: 'summary' });
    results.push({ step: 4, name: '记忆存储', pass: true, info: '3 条已存储' });
  } catch (e: any) {
    results.push({ step: 4, name: '记忆存储', pass: false, info: e.message });
  }

  console.log(JSON.stringify(results));
}

main().catch(console.error);
