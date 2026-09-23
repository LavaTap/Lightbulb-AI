const BASE = 'http://localhost:3001';
const CONV_ID = 44;
const config = { provider: 'deepseek', model: 'deepseek-chat', apiKey: 'sk-ae041e73630c4497b7d3a2ccdc2de757', useProxy: true, proxyEndpoint: 'https://api.deepseek.com/v1' };

const msgs = [
  'Python 异步编程中 aiofiles 库怎么使用？',
  'Python 异步编程的最佳实践有哪些？',
  'Python 中如何调试异步代码？',
];

async function main() {
  for (const msg of msgs) {
    const resp = await fetch(`${BASE}/api/chat/conversations/${CONV_ID}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: msg, config })
    });
    const reader = resp.body?.getReader();
    if (reader) {
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    }
    console.log('OK:', msg.substring(0, 20));
  }
  console.log('全部发送完成');
}
main().catch(console.error);
