import { getDatabase } from './src/database.js';
import { initLance, retrieveMemories, isLanceAvailable } from './src/services/lanceService.js';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  await getDatabase();
  await initLance();

  // 显示文件位置
  const lanceDir = path.resolve('data/lancedb');
  const tableDir = path.join(lanceDir, 'lightbulb_memories.lance');
  console.log('=== LanceDB 文件位置 ===');
  console.log('数据目录: ' + lanceDir);
  console.log('表目录:   ' + tableDir);
  console.log('目录存在: ' + fs.existsSync(lanceDir));
  console.log('表存在:   ' + fs.existsSync(tableDir));

  if (fs.existsSync(lanceDir)) {
    const size = getDirSize(lanceDir);
    console.log('数据大小: ' + (size / 1024 / 1024).toFixed(2) + ' MB');
  }

  console.log('');
  console.log('=== LanceDB 可用性 ===');
  console.log('Available: ' + isLanceAvailable());

  if (!isLanceAvailable()) {
    console.log('LanceDB 不可用，无法读取记忆');
    process.exit(0);
  }

  // 读取所有摘要
  console.log('');
  console.log('=== 摘要 (summary) ===');
  const summaries = await retrieveMemories({ query: '对话摘要', nResults: 20 });
  const summaryItems = summaries.filter((m: any) => (m.metadata?.type || m.type) === 'summary');
  if (summaryItems.length === 0) {
    console.log('(无摘要)');
  } else {
    summaryItems.forEach((m: any, i: number) => {
      console.log('--- 摘要 #' + (i+1) + ' [conv:' + (m.metadata?.conversation_id || m.conversation_id) + ' dist:' + m.distance.toFixed(4) + '] ---');
      console.log(m.content.substring(0, 300));
      if (m.content.length > 300) console.log('...(截断)');
    });
  }

  // 读取所有事实
  console.log('');
  console.log('=== 关键事实 (fact) ===');
  const facts = await retrieveMemories({ query: '用户偏好和信息', nResults: 30 });
  const factItems = facts.filter((m: any) => (m.metadata?.type || m.type) === 'fact');
  if (factItems.length === 0) {
    console.log('(无事实)');
  } else {
    factItems.forEach((m: any, i: number) => {
      console.log('  ' + (i+1) + '. [conv:' + (m.metadata?.conversation_id || m.conversation_id) + '] ' + m.content);
    });
  }

  // 统计
  console.log('');
  console.log('=== 统计 ===');
  console.log('摘要总数: ' + summaryItems.length);
  console.log('事实总数: ' + factItems.length);

  // SQLite 中的对话摘要
  console.log('');
  console.log('=== SQLite 对话摘要 ===');
  console.log('SQLite 文件位置: ' + path.resolve('../../data/lightbulb.db'));
}

function getDirSize(dir: string): number {
  let size = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) size += getDirSize(full);
    else if (entry.isFile()) size += fs.statSync(full).size;
  }
  return size;
}

main().catch(console.error);
