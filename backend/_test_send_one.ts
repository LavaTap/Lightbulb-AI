// 发送一条消息
const BASE = 'http://localhost:3001';
const CONV_ID = 44;
const config = { provider: 'deepseek', model: 'deepseek-chat', apiKey: 'sk-ae041e73630c4497b7d3a2ccdc2de757', useProxy: true, proxyEndpoint: 'https://api.deepseek.com/v1' };

async function main() {
  const resp = await fetch(`${BASE}/api/chat/conversations/${CONV_ID}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Python 异步编程中如何处理文件 I/O？', config })
  });
  console.log('Status:', resp.status);
  const reader = resp.body?.getReader();
  if (reader) {
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }
  }
  console.log('Done');
}
main().catch(console.error);
