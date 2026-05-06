// 通过 API 批量发送消息到对话 44
const BASE = 'http://localhost:3001';
const CONV_ID = 44;

const config = { provider: 'deepseek', model: 'deepseek-chat', apiKey: 'sk-ae041e73630c4497b7d3a2ccdc2de757', useProxy: true, proxyEndpoint: 'https://api.deepseek.com/v1' };

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

async function main() {
  for (let i = 0; i < topics.length; i++) {
    try {
      // 发送用户消息
      const resp = await fetch(`${BASE}/api/chat/conversations/${CONV_ID}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: topics[i], config })
      });
      if (!resp.ok) {
        console.log(`[${i+1}/${topics.length}] FAIL: ${resp.status}`);
        continue;
      }
      // 读取 SSE 流直到完成
      const reader = resp.body?.getReader();
      if (reader) {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }
      console.log(`[${i+1}/${topics.length}] OK`);
    } catch (e: any) {
      console.log(`[${i+1}/${topics.length}] ERROR: ${e.message}`);
    }
  }
  console.log('\n全部发送完成！');
  console.log(`现在触发摘要：curl -s -X POST "http://localhost:3001/api/chat/conversations/${CONV_ID}/summarize" -H "Content-Type: application/json" -d '{"config":{"provider":"deepseek","model":"deepseek-chat","apiKey":"sk-ae041e73630c4497b7d3a2ccdc2de757","useProxy":true,"proxyEndpoint":"https://api.deepseek.com/v1"}}'`);
}

main();
