// 新建对话 → 插入 20 条消息 → 触发摘要 → 验证结果
import { getDatabase, createConversation, createMessage, getConversationById, updateConversation, saveDatabase } from './src/database.js';
import { initLance, storeMemory, retrieveMemories, isLanceAvailable } from './src/services/lanceService.js';
import { getEmbeddingConfig } from './src/services/embeddingService.js';

async function main() {
  const db = await getDatabase();
  await initLance();

  // 1. 新建对话
  const convId = await createConversation({
    title: '摘要测试专用对话',
    model_provider: 'deepseek',
    model_name: 'deepseek-chat',
  });
  console.log('新建对话 ID:', convId);

  // 2. 插入 20 条消息（10 轮对话）
  const topics = [
    'Python 异步编程中 async/await 的基本用法是什么？',
    'asyncio.gather 和 asyncio.create_task 有什么区别？',
    'Python 中如何实现协程间的通信？',
    'asyncio.Queue 怎么使用？能举个例子吗？',
    'Python 异步编程中如何处理超时？',
    'asyncio.wait_for 和 asyncio.timeout 有什么区别？',
    'Python 异步上下文管理器怎么实现？',
    '异步迭代器和普通迭代器有什么区别？',
    'Python 中 aiohttp 库的基本用法是什么？',
    'asyncio 事件循环的工作原理是怎样的？',
  ];

  for (let i = 0; i < topics.length; i++) {
    await createMessage({
      conversation_id: convId,
      role: 'user',
      content: topics[i],
    });
    await createMessage({
      conversation_id: convId,
      role: 'assistant',
      content: `关于"${topics[i].substring(0, 15)}..."的详细解答：这是 Python 异步编程中的重要概念。`,
    });
  }

  // 确保 message_count 正确
  await updateConversation(convId, { message_count: topics.length * 2 });

  const conv = await getConversationById(convId);
  console.log('消息数:', conv?.message_count);

  // 3. 检查嵌入配置
  const embConfig = await getEmbeddingConfig();
  console.log('嵌入配置:', embConfig?.provider, embConfig?.model);

  // 4. 检查 LanceDB
  console.log('LanceDB 可用:', isLanceAvailable());

  console.log('\n准备完成！对话 ID:', convId, '消息数:', conv?.message_count);
  console.log('现在可以通过 API 触发摘要:');
  console.log(`curl -s -X POST "http://localhost:3001/api/chat/conversations/${convId}/summarize" -H "Content-Type: application/json" -d '{"config":{"provider":"deepseek","model":"deepseek-chat","apiKey":"sk-ae041e73630c4497b7d3a2ccdc2de757","useProxy":true,"proxyEndpoint":"https://api.deepseek.com/v1"}}'`);
}

main().catch(console.error);
