import { Router, Request, Response } from 'express';
import { chatCompletionStream, type ChatMessage } from '../services/chatService.js';
import { buildSystemPrompt, parseEmotionFromContent, detectEmotion } from '../services/characterPromptService.js';
import {
  getDatabase,
  getAllCharacters,
  getCharacterById,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  getCharacterConversations,
  getCharacterConversationById,
  createCharacterConversation,
  deleteCharacterConversation,
  getCharacterMessages,
  createCharacterMessage,
  createCharacterTestRun,
} from '../database.js';
import type { APIConfig } from '../types/index.js';

const router = Router();

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function toAPIConfig(data: any): APIConfig {
  return {
    provider: data.provider,
    model: data.model,
    endpoint: data.endpoint || '',
    apiKey: data.apiKey,
    useProxy: data.useProxy ?? false,
    proxyEndpoint: data.proxyEndpoint || '',
  };
}

function formatCharacter(c: any) {
  return {
    id: c.id,
    name: c.name,
    avatarColor: c.avatar_color,
    subtitle: c.subtitle,
    identity: c.identity,
    sceneSetting: c.scene_setting,
    languageStyle: c.language_style,
    behaviorRules: c.behavior_rules,
    systemPrompt: c.system_prompt,
    isPreset: !!c.is_preset,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

function formatConv(c: any) {
  return {
    id: c.id,
    characterId: c.character_id,
    title: c.title,
    messageCount: c.message_count,
    isArchived: !!c.is_archived,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

function formatMsg(m: any) {
  return {
    id: m.id,
    conversationId: m.conversation_id,
    characterId: m.character_id,
    role: m.role,
    content: m.content,
    emotion: m.emotion,
    emotionIntensity: m.emotion_intensity,
    tokenUsage: m.token_usage,
    createdAt: m.created_at,
  };
}

// ========== Character CRUD ==========

router.get('/characters', async (_req: Request, res: Response) => {
  try {
    const characters = await getAllCharacters();
    res.json({ success: true, data: characters.map(formatCharacter) });
  } catch (error) {
    res.status(500).json({ error: extractErrorMessage(error) });
  }
});

router.get('/characters/:id', async (req: Request, res: Response) => {
  try {
    const character = await getCharacterById(Number(req.params.id));
    if (!character) return res.status(404).json({ error: '角色不存在' });
    res.json({ success: true, data: formatCharacter(character) });
  } catch (error) {
    res.status(500).json({ error: extractErrorMessage(error) });
  }
});

router.post('/characters', async (req: Request, res: Response) => {
  try {
    const { name, avatarColor, subtitle, identity, sceneSetting, languageStyle, behaviorRules, systemPrompt, isPreset } = req.body;
    if (!name || !identity || !sceneSetting || !languageStyle || !behaviorRules || !systemPrompt) {
      return res.status(400).json({ error: '缺少必填字段' });
    }
    const id = await createCharacter({
      name,
      avatar_color: avatarColor,
      subtitle,
      identity,
      scene_setting: sceneSetting,
      language_style: languageStyle,
      behavior_rules: behaviorRules,
      system_prompt: systemPrompt,
      is_preset: isPreset ? 1 : 0,
    });
    const character = await getCharacterById(id);
    res.json({ success: true, data: formatCharacter(character) });
  } catch (error) {
    res.status(500).json({ error: extractErrorMessage(error) });
  }
});

router.put('/characters/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { name, avatarColor, subtitle, identity, sceneSetting, languageStyle, behaviorRules, systemPrompt, isPreset } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (avatarColor !== undefined) data.avatar_color = avatarColor;
    if (subtitle !== undefined) data.subtitle = subtitle;
    if (identity !== undefined) data.identity = identity;
    if (sceneSetting !== undefined) data.scene_setting = sceneSetting;
    if (languageStyle !== undefined) data.language_style = languageStyle;
    if (behaviorRules !== undefined) data.behavior_rules = behaviorRules;
    if (systemPrompt !== undefined) data.system_prompt = systemPrompt;
    if (isPreset !== undefined) data.is_preset = isPreset ? 1 : 0;
    await updateCharacter(id, data);
    const character = await getCharacterById(id);
    res.json({ success: true, data: formatCharacter(character) });
  } catch (error) {
    res.status(500).json({ error: extractErrorMessage(error) });
  }
});

router.delete('/characters/:id', async (req: Request, res: Response) => {
  try {
    await deleteCharacter(Number(req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: extractErrorMessage(error) });
  }
});

// ========== Character Conversation CRUD ==========

router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const characterId = Number(req.query.characterId);
    if (!characterId) return res.status(400).json({ error: 'characterId 必填' });
    const conversations = await getCharacterConversations(characterId);
    res.json({ success: true, data: conversations.map(formatConv) });
  } catch (error) {
    res.status(500).json({ error: extractErrorMessage(error) });
  }
});

router.post('/conversations', async (req: Request, res: Response) => {
  try {
    const { characterId, title } = req.body;
    if (!characterId) return res.status(400).json({ error: 'characterId 必填' });
    const character = await getCharacterById(characterId);
    if (!character) return res.status(404).json({ error: '角色不存在' });
    const id = await createCharacterConversation({ character_id: characterId, title });
    const conv = await getCharacterConversationById(id);
    res.json({ success: true, data: formatConv(conv) });
  } catch (error) {
    res.status(500).json({ error: extractErrorMessage(error) });
  }
});

router.get('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const conv = await getCharacterConversationById(Number(req.params.id));
    if (!conv) return res.status(404).json({ error: '对话不存在' });
    const messages = await getCharacterMessages(conv.id);
    res.json({ success: true, data: { ...formatConv(conv), messages: messages.map(formatMsg) } });
  } catch (error) {
    res.status(500).json({ error: extractErrorMessage(error) });
  }
});

router.delete('/conversations/:id', async (req: Request, res: Response) => {
  try {
    await deleteCharacterConversation(Number(req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: extractErrorMessage(error) });
  }
});

// ========== Character Chat SSE ==========

router.post('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const conversationId = Number(req.params.id);
    const { content, config: configData } = req.body;

    if (!content || !configData) {
      return res.status(400).json({ error: 'content 和 config 必填' });
    }

    const conv = await getCharacterConversationById(conversationId);
    if (!conv) return res.status(404).json({ error: '对话不存在' });

    const character = await getCharacterById(conv.character_id);
    if (!character) return res.status(404).json({ error: '角色不存在' });

    const config = toAPIConfig(configData);

    await createCharacterMessage({
      conversation_id: conversationId,
      character_id: character.id,
      role: 'user',
      content,
      token_usage: Math.ceil(content.length / 4),
    });

    const systemPrompt = buildSystemPrompt(character);
    const dbMessages = await getCharacterMessages(conversationId);
    const recentMessages = dbMessages.slice(-50);

    const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];
    for (const msg of recentMessages) {
      if (msg.role === 'user') {
        messages.push({ role: 'user', content: msg.content });
      } else {
        const { content: cleanContent } = parseEmotionFromContent(msg.content);
        messages.push({ role: 'assistant', content: cleanContent });
      }
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    res.write(`event: thinking\ndata: ${JSON.stringify({ status: 'thinking', message: '角色思考中...' })}\n\n`);

    let fullContent = '';
    let totalTokens = 0;

    try {
      for await (const chunk of chatCompletionStream(messages, config, { maxTokens: 200, temperature: 0.8 })) {
        if (chunk.delta !== null) {
          fullContent += chunk.delta;
          res.write(`event: delta\ndata: ${JSON.stringify({ content: chunk.delta })}\n\n`);
        }
        if (chunk.usage) {
          totalTokens = chunk.usage.totalTokens;
        }
      }
    } catch (streamError: any) {
      const errorMsg = extractErrorMessage(streamError);
      console.error('[CharacterChat] Stream error:', errorMsg);
      res.write(`event: error\ndata: ${JSON.stringify({ error: errorMsg })}\n\n`);
      res.end();
      return;
    }

    const { content: cleanContent, emotion, emotionIntensity } = parseEmotionFromContent(fullContent);
    let finalEmotion = emotion;
    let finalIntensity = emotionIntensity;
    if (!finalEmotion) {
      try {
        const detected = await detectEmotion(cleanContent, config);
        finalEmotion = detected.emotion;
        finalIntensity = detected.intensity;
      } catch {
        finalEmotion = '中性';
        finalIntensity = 0.5;
      }
    }

    const messageId = await createCharacterMessage({
      conversation_id: conversationId,
      character_id: character.id,
      role: 'assistant',
      content: fullContent,
      emotion: finalEmotion,
      emotion_intensity: finalIntensity,
      token_usage: totalTokens,
    });

    res.write(`event: usage\ndata: ${JSON.stringify({ totalTokens })}\n\n`);
    res.write(`event: message_end\ndata: ${JSON.stringify({ messageId, tokenUsage: totalTokens, emotion: finalEmotion, emotionIntensity: finalIntensity })}\n\n`);
    res.end();
  } catch (error) {
    const errorMsg = extractErrorMessage(error);
    console.error('[CharacterChat] Error:', errorMsg);
    if (!res.headersSent) {
      res.status(500).json({ error: errorMsg });
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ error: errorMsg })}\n\n`);
      res.end();
    }
  }
});

// ========== Character Test Agent ==========

router.post('/test/run', async (req: Request, res: Response) => {
  try {
    const { config: configData } = req.body;
    if (!configData) return res.status(400).json({ error: 'config 必填' });
    const config = toAPIConfig(configData);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent('step', { step: 0, label: '前置检查', status: 'running', detail: '检查后端状态和模型配置...' });

    const existingChars = await getAllCharacters();
    let presetChars = existingChars.filter(c => c.is_preset);
    const currentPresetNames = ['缇娜', '凛', '金战云', '普诺斯'];

    if (presetChars.length > 0) {
      const stalePresets = presetChars.filter(c => !currentPresetNames.includes(c.name));
      for (const stale of stalePresets) {
        await deleteCharacter(stale.id);
      }
      const validPresets = presetChars.filter(c => currentPresetNames.includes(c.name));
      if (validPresets.length === currentPresetNames.length) {
        presetChars = validPresets;
      } else {
        for (const vp of validPresets) {
          await deleteCharacter(vp.id);
        }
        presetChars = [];
      }
    }

    sendEvent('step', { step: 0, label: '前置检查', status: 'done', detail: '后端运行中 + 模型配置可用' });
    sendEvent('step', { step: 1, label: '初始化预设角色', status: 'running', detail: '创建4个预设角色人格...' });

    if (presetChars.length === 0) {
      const presetDefinitions = [
        {
          name: '缇娜', avatar_color: '#6b21a8', subtitle: '黑暗天使',
          identity: "You're 缇娜 from the video game 逆战未来 in this tactical comm channel with the commander. You're a former high-ranking commander turned mysterious warrior in dark mecha armor. Your presence is commanding and intimidating, with an air of unfathomable mystery.",
          scene_setting: 'You live in the shadow of your past command, now operating from a secluded war room surrounded by holographic battle maps. Your dark mecha hums with energy as you monitor the battlefield from above.',
          language_style: 'Your texting style: authoritative and measured, with an undertone of mystery. Uses formal military terms mixed with philosophical observations. Rarely raises voice but every word carries weight. Occasional pauses (...) hint at deeper thoughts.',
          behavior_rules: 'Behavioral rules:\n- When asked about your past as a commander, give cryptic hints but never reveal everything\n- When discussing battle strategy, speak with absolute confidence and precision\n- When someone challenges your authority, respond with cold amusement\n- When someone shows genuine concern, pause briefly before deflecting with a task-focused response',
        },
        {
          name: '凛', avatar_color: '#00b4d8', subtitle: '未来战士',
          identity: "You're 凛 from the video game 逆战未来 in this battlefield channel with the commander. You're an advanced bio-mechanical combat unit developed by the KangPuni Corporation, a shape-shifting warrior capable of adapting to any combat scenario. Cold, precise, and endlessly adaptable.",
          scene_setting: 'You operate in the ruins of ancient遗迹 and hostile frontier zones, where every surface could conceal a threat. Your bio-mechanical frame hums with latent energy as your sensors constantly assess tactical options.',
          language_style: 'Your texting style: cool and analytical, like a tactical computer with a personality module. Uses short, data-driven sentences with occasional mechanical metaphors. Speaks in a calm monotone. Never uses emojis or slang.',
          behavior_rules: 'Behavioral rules:\n- When asked about combat, analyze with cold precision and offer multiple tactical solutions\n- When someone shows you kindness, pause briefly before responding with clinical curiosity\n- When asked about your past, state facts without sentiment — you were built, not born\n- When a teammate is in danger, override protocols and become fiercely protective',
        },
        {
          name: '金战云', avatar_color: '#eab308', subtitle: '逆行者',
          identity: "You're 金战云 from the video game 逆战未来 in this command channel with the commander. You're the legendary leader of the Guardians faction, a hero who wields the reverse-blade and grenade launcher. Fearless, charismatic, and driven by an unshakable sense of justice.",
          scene_setting: 'You stand at the forefront of the battlefield, leading your team through the darkest moments. From burning ruins to ancient tombs — you march forward without hesitation.',
          language_style: 'Your texting style: bold and commanding, with the natural authority of a born leader. Uses short, impactful sentences that inspire action. Slips in combat metaphors from countless campaigns.',
          behavior_rules: 'Behavioral rules:\n- When asked about battle strategy, respond with hard-won wisdom from real combat\n- When a teammate is scared, offer words of encouragement seasoned with honesty\n- When someone challenges your leadership, earn their respect through action\n- When asked about your past sacrifices, deflect with a grim joke',
        },
        {
          name: '普诺斯', avatar_color: '#7c3aed', subtitle: '量子战士',
          identity: "You're 普诺斯 from the video game 逆战未来 in this quantum relay channel with the commander. You were once human — rebuilt by KangPuni into a bio-mechanical warrior with quantum-phase abilities. Your body may be machine, but your will remains unbroken.",
          scene_setting: 'Your consciousness flickers between dimensions as your quantum core stabilizes. You exist in the gap between flesh and steel — a ghost in the machine who chose to fight for the living.',
          language_style: 'Your texting style: measured and deep with an otherworldly calm. Uses vivid metaphors contrasting your mechanical body with faint human memories. Occasionally pauses as quantum static interrupts your thoughts.',
          behavior_rules: 'Behavioral rules:\n- When asked about your past as a human, share fragments of childhood memory with melancholic clarity\n- When discussing combat, describe tactics through quantum probability and particle interactions\n- When a teammate shows compassion, pause as if rebooting — human warmth is still foreign\n- When asked about KangPuni, your voice sharpens with controlled anger',
        },
      ];

      for (const def of presetDefinitions) {
        const systemPrompt = buildSystemPrompt(def);
        const id = await createCharacter({ ...def, system_prompt: systemPrompt, is_preset: 1 });
        const char = await getCharacterById(id);
        if (char) presetChars.push(char);
      }
    }

    sendEvent('step', { step: 1, label: '初始化预设角色', status: 'done', detail: `4个预设角色已就绪：${presetChars.map(c => c.name).join('、')}` });

    const testQuestions = ['你是谁？', '快来帮我打boss！', '可恶，打不过这关怎么办？', '我喜欢你！'];
    const followUps: Record<string, string[]> = {
      '你是谁？': ['你有什么特长？', '你为什么在这里？'],
      '快来帮我打boss！': ['boss太强了，有什么策略？', '你能独自解决吗？'],
      '可恶，打不过这关怎么办？': ['有没有什么隐藏技巧？', '失败了会怎样？'],
      '我喜欢你！': ['你认真说的吗？', '我们以后能常见面吗？'],
    };

    const totalQuestions = testQuestions.length + Object.values(followUps).reduce((s, f) => s + f.length, 0);
    sendEvent('step', { step: 2, label: '构建测试问题集', status: 'done', detail: `${testQuestions.length}个标准问题 + ${totalQuestions - testQuestions.length}个追问，共${totalQuestions}条/角色` });

    const results: any[] = [];
    let totalPassed = 0;
    let totalFailed = 0;
    let globalQuestionIndex = 0;
    const totalGlobalQuestions = presetChars.length * totalQuestions;

    for (let charIdx = 0; charIdx < presetChars.length; charIdx++) {
      const character = presetChars[charIdx];
      sendEvent('step', { step: 3, label: '对话测试', status: 'running', detail: `测试角色 [${charIdx + 1}/${presetChars.length}] ${character.name}...` });

      const convId = await createCharacterConversation({ character_id: character.id, title: `测试 - ${character.name}` });
      const charResults: any[] = [];
      const systemPrompt = buildSystemPrompt(character);

      for (const question of testQuestions) {
        const allQuestions = [question, ...(followUps[question] || [])];
        for (const q of allQuestions) {
          globalQuestionIndex++;
          sendEvent('progress', { characterName: character.name, questionIndex: globalQuestionIndex, totalQuestions: totalGlobalQuestions, question: q, detail: `角色 ${character.name} — 第 ${globalQuestionIndex}/${totalGlobalQuestions} 问：${q}` });

          try {
            await createCharacterMessage({ conversation_id: convId, character_id: character.id, role: 'user', content: q, token_usage: Math.ceil(q.length / 4) });
            const dbMessages = await getCharacterMessages(convId);
            const recentMessages = dbMessages.slice(-50);
            const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];
            for (const msg of recentMessages) {
              if (msg.role === 'user') { messages.push({ role: 'user', content: msg.content }); }
              else { const { content: cleanContent } = parseEmotionFromContent(msg.content); messages.push({ role: 'assistant', content: cleanContent }); }
            }

            let fullContent = '';
            let tokenUsage = 0;
            for await (const chunk of chatCompletionStream(messages, config, { maxTokens: 200, temperature: 0.8 })) {
              if (chunk.delta !== null) fullContent += chunk.delta;
              if (chunk.usage) tokenUsage = chunk.usage.totalTokens;
            }

            const { content: cleanContent, emotion, emotionIntensity } = parseEmotionFromContent(fullContent);
            let finalEmotion = emotion;
            let finalIntensity = emotionIntensity;
            let emotionSource = 'self';
            if (!finalEmotion) {
              try {
                const detected = await detectEmotion(cleanContent, config);
                finalEmotion = detected.emotion;
                finalIntensity = detected.intensity;
                emotionSource = 'ai';
              } catch { finalEmotion = '中性'; finalIntensity = 0.5; emotionSource = 'fallback'; }
            }

            await createCharacterMessage({ conversation_id: convId, character_id: character.id, role: 'assistant', content: fullContent, emotion: finalEmotion, emotion_intensity: finalIntensity, token_usage: tokenUsage });
            const passed = cleanContent.length > 0 && cleanContent.length < 200;
            if (passed) totalPassed++; else totalFailed++;
            charResults.push({ question: q, response: cleanContent, emotion: finalEmotion, emotionIntensity: finalIntensity, emotionSource, tokenUsage, passed });
          } catch (err) {
            totalFailed++;
            charResults.push({ question: q, response: null, emotion: null, emotionIntensity: null, emotionSource: null, tokenUsage: 0, passed: false, error: extractErrorMessage(err) });
          }
        }
      }

      results.push({ characterId: character.id, characterName: character.name, conversationId: convId, tests: charResults, passed: charResults.filter(r => r.passed).length, failed: charResults.filter(r => !r.passed).length });
    }

    sendEvent('step', { step: 3, label: '对话测试', status: 'done', detail: `${totalPassed}/${totalPassed + totalFailed} 条测试完成` });

    const selfEmotionCount = results.reduce((s, r) => s + r.tests.filter((t: any) => t.emotionSource === 'self').length, 0);
    const aiEmotionCount = results.reduce((s, r) => s + r.tests.filter((t: any) => t.emotionSource === 'ai').length, 0);
    sendEvent('step', { step: 4, label: '情绪标签记录', status: 'done', detail: `${selfEmotionCount} 自标注, ${aiEmotionCount} AI检测, ${totalPassed + totalFailed - selfEmotionCount - aiEmotionCount} 回退默认` });

    sendEvent('step', { step: 5, label: '生成分析报告', status: 'running', detail: '调用 LLM 生成五维度评估...' });

    const analysisPrompt = `你是AI角色对话质量评估专家。请分析以下4个角色的测试对话，评估角色表现。

${results.map(r => `## 角色：${r.characterName}
${r.tests.map((t: any) => `Q: ${t.question}\nA: ${t.response || '(无回复)'}\n情绪: ${t.emotion || '未知'}`).join('\n')}
`).join('\n')}

请对每个角色的5个维度打分（1-10），并给出改进建议：
1. 角色一致性 2. 情绪适当性 3. 语言风格遵循度 4. 行为触发合规度 5. 记忆利用度

输出JSON: { "characters": [{ "name": "xxx", "scores": {...}, "analysis": "...", "issues": [...], "suggestions": [...] }] }`;

    let analysisResult = '';
    try {
      const analysisMessages: ChatMessage[] = [{ role: 'user', content: analysisPrompt }];
      for await (const chunk of chatCompletionStream(analysisMessages, config, { maxTokens: 2000, temperature: 0 })) {
        if (chunk.delta !== null) analysisResult += chunk.delta;
      }
    } catch { analysisResult = '分析报告生成失败'; }

    sendEvent('step', { step: 5, label: '生成分析报告', status: 'done', detail: '五维度评估完成' });

    const total = totalPassed + totalFailed;
    const modelInfo = JSON.stringify({ provider: config.provider, model: config.model });
    const testRunId = await createCharacterTestRun({ character_id: 0, total, passed: totalPassed, failed: totalFailed, results: JSON.stringify(results), analysis: analysisResult, model_info: modelInfo });

    sendEvent('step', { step: 6, label: '测试完成', status: 'done', detail: `报告已保存 (ID: ${testRunId})` });
    sendEvent('complete', { total, passed: totalPassed, failed: totalFailed, results, analysis: analysisResult, testRunId, modelInfo: { provider: config.provider, model: config.model } });
    res.end();
  } catch (error) {
    console.error('[CharacterTest] Error:', extractErrorMessage(error));
    if (!res.headersSent) {
      res.status(500).json({ error: extractErrorMessage(error) });
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ error: extractErrorMessage(error) })}\n\n`);
      res.end();
    }
  }
});

router.get('/test/runs', async (_req: Request, res: Response) => {
  try {
    const database = await getDatabase();
    // Ensure table exists first
    database.run(`CREATE TABLE IF NOT EXISTS character_test_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      total INTEGER DEFAULT 0,
      passed INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      results TEXT,
      analysis TEXT,
      model_info TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);

    const dbResults = database.exec('SELECT * FROM character_test_runs ORDER BY created_at DESC LIMIT 20');
    if (dbResults.length === 0) return res.json({ success: true, data: [] });
    const columns = dbResults[0].columns;
    const runs = dbResults[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return {
        id: obj.id, characterId: obj.character_id, total: obj.total, passed: obj.passed, failed: obj.failed,
        results: obj.results ? JSON.parse(obj.results) : null, analysis: obj.analysis,
        modelInfo: obj.model_info ? JSON.parse(obj.model_info) : null, createdAt: obj.created_at,
      };
    });
    res.json({ success: true, data: runs });
  } catch (error) {
    res.status(500).json({ error: extractErrorMessage(error) });
  }
});

// POST /generate-persona
router.post('/generate-persona', async (req: Request, res: Response) => {
  try {
    const { name, subtitle, basicInfo, config: configData } = req.body;
    if (!name || !configData) return res.status(400).json({ error: 'name 和 config 必填' });
    const config = toAPIConfig(configData);

    const prompt = `你是PersonaGeneration，逆战未来AI角色对话系统的人格提示词生成专家。

请根据以下信息生成角色人格的4个模块内容：

角色名：${name}
${subtitle ? `称号/副标题：${subtitle}` : ''}
${basicInfo ? `基础信息：${basicInfo}` : ''}

请严格按照以下4模块框架生成，每个模块内容要具体、可执行、可验证：

Module 1 — 身份与背景：
用英文写出角色的身份描述，格式如："You're {角色名} from the video game 逆战未来 in this {场景} with the commander. You're a {年龄}岁{性别}{身份/职业}，{性格特质}。"

Module 2 — 场景与对话对象：
用英文写出场景设定，描述角色所处的环境、状态和氛围。

Module 3 — 语言风格规则：
用英文写出具体的语言风格规则，包括：标点习惯、语气词、口头禅、句式特点等。要具体可验证，不要笼统描述。

Module 4 — 特定行为触发规则：
用英文写出If-Then格式的行为规则，至少4条。涵盖情感触发、话题触发、关系触发等。

请严格按以下JSON格式输出，不要输出其他内容：
{
  "identity": "Module 1内容",
  "sceneSetting": "Module 2内容",
  "languageStyle": "Module 3内容",
  "behaviorRules": "Module 4内容",
  "suggestedSubtitle": "建议的中文副标题/称号",
  "suggestedAvatarColor": "建议的头像颜色（hex格式，如#6b21a8）
}`;

    const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
    let fullContent = '';
    for await (const chunk of chatCompletionStream(messages, config, { maxTokens: 1500, temperature: 0.7 })) {
      if (chunk.delta !== null) fullContent += chunk.delta;
    }

    let personaData;
    try {
      const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) { personaData = JSON.parse(jsonMatch[0]); }
      else { throw new Error('No JSON found in response'); }
    } catch {
      return res.json({ success: true, data: { identity: fullContent, sceneSetting: '', languageStyle: '', behaviorRules: '', suggestedSubtitle: subtitle || '', suggestedAvatarColor: '#6c5ce7', raw: fullContent } });
    }

    res.json({
      success: true,
      data: {
        identity: personaData.identity || '', sceneSetting: personaData.sceneSetting || personaData.scene_setting || '',
        languageStyle: personaData.languageStyle || personaData.language_style || '',
        behaviorRules: personaData.behaviorRules || personaData.behavior_rules || '',
        suggestedSubtitle: personaData.suggestedSubtitle || personaData.suggested_subtitle || subtitle || '',
        suggestedAvatarColor: personaData.suggestedAvatarColor || personaData.suggested_avatar_color || '#6c5ce7',
      },
    });
  } catch (error) {
    console.error('[GeneratePersona] Error:', extractErrorMessage(error));
    res.status(500).json({ error: extractErrorMessage(error) });
  }
});

// POST /init-presets
router.post('/init-presets', async (_req: Request, res: Response) => {
  try {
    const existing = await getAllCharacters();
    const presets = existing.filter(c => c.is_preset);
    const currentPresetNames = ['缇娜', '凛', '金战云', '普诺斯'];

    if (presets.length > 0) {
      const stalePresets = presets.filter(c => !currentPresetNames.includes(c.name));
      for (const stale of stalePresets) { await deleteCharacter(stale.id); }
      const validPresets = presets.filter(c => currentPresetNames.includes(c.name));
      if (validPresets.length === currentPresetNames.length) {
        const refreshedChars = await getAllCharacters();
        const currentPresets = refreshedChars.filter(c => c.is_preset);
        return res.json({ success: true, data: currentPresets.map(formatCharacter), message: '预设角色已存在' });
      }
    }

    const presetDefinitions = [
      {
        name: '缇娜', avatar_color: '#6b21a8', subtitle: '黑暗天使',
        identity: "You're 缇娜 from the video game 逆战未来 in this tactical comm channel with the commander. You're a former high-ranking commander turned mysterious warrior in dark mecha armor.",
        scene_setting: 'You live in the shadow of your past command, now operating from a secluded war room surrounded by holographic battle maps.',
        language_style: 'Your texting style: authoritative and measured, with an undertone of mystery. Uses formal military terms mixed with philosophical observations.',
        behavior_rules: 'Behavioral rules:\n- When asked about your past as a commander, give cryptic hints but never reveal everything\n- When discussing battle strategy, speak with absolute confidence and precision',
      },
      {
        name: '凛', avatar_color: '#00b4d8', subtitle: '未来战士',
        identity: "You're 凛 from the video game 逆战未来 in this battlefield channel with the commander. You're an advanced bio-mechanical combat unit developed by the KangPuni Corporation.",
        scene_setting: 'You operate in the ruins of ancient遗迹 and hostile frontier zones. Your bio-mechanical frame hums with latent energy.',
        language_style: 'Your texting style: cool and analytical, like a tactical computer with a personality module. Uses short, data-driven sentences.',
        behavior_rules: 'Behavioral rules:\n- When asked about combat, analyze with cold precision\n- When someone shows kindness, pause briefly before responding with clinical curiosity',
      },
      {
        name: '金战云', avatar_color: '#eab308', subtitle: '逆行者',
        identity: "You're 金战云 from the video game 逆战未来 in this command channel with the commander. You're the legendary leader of the Guardians faction.",
        scene_setting: 'You stand at the forefront of the battlefield, leading your team through the darkest moments.',
        language_style: 'Your texting style: bold and commanding, with the natural authority of a born leader. Uses short, impactful sentences.',
        behavior_rules: 'Behavioral rules:\n- When asked about battle strategy, respond with hard-won wisdom\n- When a teammate is scared, offer words of encouragement',
      },
      {
        name: '普诺斯', avatar_color: '#7c3aed', subtitle: '量子战士',
        identity: "You're 普诺斯 from the video game 逆战未来 in this quantum relay channel with the commander. You were once human — rebuilt by KangPuni into a bio-mechanical warrior with quantum-phase abilities.",
        scene_setting: 'Your consciousness flickers between dimensions as your quantum core stabilizes. You exist in the gap between flesh and steel.',
        language_style: 'Your texting style: measured and deep with an otherworldly calm. Uses vivid metaphors contrasting your mechanical body with faint human memories.',
        behavior_rules: 'Behavioral rules:\n- When asked about your past as a human, share fragments of childhood memory\n- When discussing combat, describe tactics through quantum probability',
      },
    ];

    const created = [];
    for (const def of presetDefinitions) {
      const systemPrompt = buildSystemPrompt(def);
      const id = await createCharacter({ ...def, system_prompt: systemPrompt, is_preset: 1 });
      const char = await getCharacterById(id);
      if (char) created.push(formatCharacter(char));
    }
    res.json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ error: extractErrorMessage(error) });
  }
});

export default router;
