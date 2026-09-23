import { getDatabase } from './src/database.js';

async function main() {
  const db = await getDatabase();
  
  // 检查对话 38
  const convResult = db.exec('SELECT * FROM conversations WHERE id = ?', [38]);
  if (convResult.length > 0 && convResult[0].values.length > 0) {
    const cols = convResult[0].columns;
    const vals = convResult[0].values[0];
    const conv: any = {};
    cols.forEach((c: string, i: number) => { conv[c] = vals[i]; });
    console.log('对话 38:');
    console.log('  message_count:', conv.message_count);
    console.log('  summary:', conv.summary ? conv.summary.substring(0, 60) : 'null');
    console.log('  summary_updated_at:', conv.summary_updated_at);
  }

  // 检查 chat_messages 数量
  const msgCount = db.exec('SELECT COUNT(*) as cnt FROM chat_messages WHERE conversation_id = ?', [38]);
  console.log('  chat_messages 实际条数:', msgCount[0].values[0][0]);
}

main().catch(console.error);
