import { getDatabase } from './src/database.js';
import { initLance, retrieveMemories, isLanceAvailable } from './src/services/lanceService.js';

async function main() {
  await getDatabase();
  await initLance();

  if (!isLanceAvailable()) {
    console.log('LanceDB not available');
    process.exit(0);
  }

  // 检索对话 38 相关的记忆
  const results = await retrieveMemories({ query: '水彩画基础知识', nResults: 10, conversationId: 38 });
  console.log(`对话 38 的记忆数: ${results.length}`);
  results.forEach((r: any, i: number) => {
    console.log(`  [${i}] type=${r.metadata?.type || r.type} distance=${r.distance.toFixed(4)} content=${(r.content || '').substring(0, 60)}`);
  });

  // 跨对话检索（不传 conversationId）
  const crossResults = await retrieveMemories({ query: '水彩画', nResults: 5 });
  console.log(`\n跨对话检索结果数: ${crossResults.length}`);
  crossResults.forEach((r: any, i: number) => {
    console.log(`  [${i}] conv=${r.metadata?.conversation_id || r.conversation_id} type=${r.metadata?.type || r.type} content=${(r.content || '').substring(0, 50)}`);
  });
}

main().catch(console.error);
