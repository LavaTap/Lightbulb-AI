// 发送 20 条消息到对话 38，触发摘要生成
const BASE = 'http://localhost:3001';
const CONV_ID = 38;

const messages = [
  '你好，我想了解一下水彩画的基础知识',
  '水彩画需要哪些工具和材料？',
  '我听说水彩纸很重要，有什么推荐的吗？',
  '水彩颜料应该怎么选择？新手适合用哪种？',
  '水彩画笔有哪些种类？我需要准备几支？',
  '水彩画的基本技法有哪些？能介绍一下吗？',
  '什么是湿画法？和干画法有什么区别？',
  '水彩画中怎么控制水分？我总是控制不好',
  '水彩画的色彩混合有什么技巧？',
  '怎么画水彩风景画？能教教我吗？',
  '水彩画天空怎么画？特别是云彩的部分',
  '水彩画树木有什么技巧？',
  '水彩画中留白胶怎么使用？',
  '水彩画常见的错误有哪些？怎么避免？',
  '水彩画怎么保存？需要装裱吗？',
  '我想学习水彩人物画，难度大吗？',
  '水彩画和水粉画有什么区别？',
  '水彩画的构图有什么要点？',
  '推荐一些水彩画入门书籍或课程吧',
  '水彩画的创作灵感从哪里获取？',
];

const config = { provider: 'deepseek', model: 'deepseek-chat', apiKey: 'sk-ae041e73630c4497b7d3a2ccdc2de757', useProxy: true, proxyEndpoint: 'https://api.deepseek.com/v1' };

async function sendMessages() {
  for (let i = 0; i < messages.length; i++) {
    try {
      const resp = await fetch(`${BASE}/api/chat/conversations/${CONV_ID}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messages[i], config })
      });
      const ok = resp.ok;
      if (ok) {
        // 读取流直到完成
        const reader = resp.body?.getReader();
        if (reader) {
          while (true) {
            const { done } = await reader.read();
            if (done) break;
          }
        }
      }
      console.log(`[${i+1}/${messages.length}] ${ok ? 'OK' : 'FAIL'}`);
    } catch (e) {
      console.log(`[${i+1}/${messages.length}] ERROR`);
    }
  }
  console.log('\n全部消息发送完成！');
}

sendMessages().catch(console.error);
