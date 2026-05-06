import { getDatabase } from './src/database.js';
import { initLance, isLanceAvailable, storeMemory, retrieveMemories, deleteConversationMemories } from './src/services/lanceService.js';
import { getEmbeddingConfig, generateEmbedding } from './src/services/embeddingService.js';

async function runTests() {
  const results: { step: number; name: string; pass: boolean; info: string }[] = [];

  // Step 1: LanceDB 连通性
  try {
    await getDatabase();
    await initLance();
    const available = isLanceAvailable();
    results.push({ step: 1, name: 'LanceDB 连通性', pass: available, info: available ? '已连接' : '不可用' });
  } catch (e: any) {
    results.push({ step: 1, name: 'LanceDB 连通性', pass: false, info: e.message });
  }

  if (!results[0].pass) {
    console.log(JSON.stringify(results));
    process.exit(0);
  }

  // Step 2: 嵌入生成
  try {
    const config = await getEmbeddingConfig();
    if (!config) {
      results.push({ step: 2, name: '嵌入生成', pass: false, info: 'No embedding config' });
    } else {
      const embedding = await generateEmbedding('测试文本');
      results.push({ step: 2, name: '嵌入生成', pass: true, info: `${config.provider} ${embedding.length}d` });
    }
  } catch (e: any) {
    results.push({ step: 2, name: '嵌入生成', pass: false, info: e.message });
  }

  // Step 3: 记忆存储
  try {
    await storeMemory({ conversationId: 99999, content: '测试记忆条目-用户喜欢水彩画', type: 'fact' });
    await storeMemory({ conversationId: 99999, content: '测试记忆条目-用户是插画师', type: 'fact' });
    await storeMemory({ conversationId: 99999, content: '测试摘要-这是一个关于绘画的对话', type: 'summary' });
    results.push({ step: 3, name: '记忆存储', pass: true, info: '3 条已存储' });
  } catch (e: any) {
    results.push({ step: 3, name: '记忆存储', pass: false, info: e.message });
  }

  // Step 4: 语义检索
  try {
    const mems = await retrieveMemories({ query: '用户做什么工作的', nResults: 3 });
    if (mems.length === 0) {
      results.push({ step: 4, name: '语义检索', pass: false, info: 'No results' });
    } else {
      const hasRelevant = mems.some((r: any) => r.content.includes('插画师') || r.content.includes('水彩'));
      results.push({ step: 4, name: '语义检索', pass: hasRelevant, info: `结果:${mems.length} 距离:${mems[0].distance.toFixed(4)}` });
    }
  } catch (e: any) {
    results.push({ step: 4, name: '语义检索', pass: false, info: e.message });
  }

  // Step 5: 跨对话检索
  try {
    const mems = await retrieveMemories({ query: '绘画相关的话题', nResults: 5 });
    const crossConv = mems.filter((r: any) => r.metadata?.conversation_id);
    results.push({ step: 5, name: '跨对话检索', pass: crossConv.length > 0, info: `${crossConv.length} 条结果` });
  } catch (e: any) {
    results.push({ step: 5, name: '跨对话检索', pass: false, info: e.message });
  }

  // Step 6: 记忆删除
  try {
    await deleteConversationMemories(99999);
    const after = await retrieveMemories({ query: '测试记忆条目', nResults: 5, conversationId: 99999 });
    results.push({ step: 6, name: '记忆删除', pass: after.length === 0, info: after.length === 0 ? '已清理' : `剩余${after.length}条` });
  } catch (e: any) {
    results.push({ step: 6, name: '记忆删除', pass: false, info: e.message });
  }

  console.log(JSON.stringify(results));
}

runTests().catch(e => console.error(e));
