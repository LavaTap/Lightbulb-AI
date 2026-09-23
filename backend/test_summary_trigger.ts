// 直接向 SQLite 插入 20 条消息，然后触发摘要
import { getDatabase, saveDatabase } from './src/database.js';

async function main() {
  const db = await getDatabase();
  const CONV_ID = 38;

  // 先检查对话是否存在
  const convResult = db.exec('SELECT * FROM conversations WHERE id = ?', [CONV_ID]);
  if (convResult.length === 0 || convResult[0].values.length === 0) {
    console.log('对话 38 不存在');
    process.exit(0);
  }
  const convCols = convResult[0].columns;
  const convRow = convResult[0].values[0];
  const conv: any = {};
  convCols.forEach((col: string, i: number) => { conv[col] = convRow[i]; });
  console.log(`对话: ${conv.title}, 当前消息数: ${conv.message_count}`);

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

  // 使用事务批量插入
  db.run('BEGIN TRANSACTION');
  try {
    for (let i = 0; i < messages.length; i++) {
      // 用户消息
      db.run('INSERT INTO chat_messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, datetime(\'now\'))', [CONV_ID, 'user', messages[i]]);
      // AI 回复
      db.run('INSERT INTO chat_messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, datetime(\'now\'))', [CONV_ID, 'assistant', `这是对"${messages[i].substring(0, 10)}..."的回复。在水彩画中，这是一个很好的问题，我来详细解答。`]);
    }
    // 更新对话消息计数
    db.run('UPDATE conversations SET message_count = message_count + ?, updated_at = datetime(\'now\') WHERE id = ?', [messages.length * 2, CONV_ID]);
    db.run('COMMIT');
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
  saveDatabase();

  const updated = db.exec('SELECT * FROM conversations WHERE id = ?', [CONV_ID]);
  const uRow = updated[0].values[0];
  const uConv: any = {};
  convCols.forEach((col: string, i: number) => { uConv[col] = uRow[i]; });
  console.log(`插入完成！当前消息数: ${uConv.message_count}`);
  console.log('对话 ID 38 已准备好 40 条消息（20 条用户 + 20 条助手），可以触发摘要了');
}

main().catch(console.error);
