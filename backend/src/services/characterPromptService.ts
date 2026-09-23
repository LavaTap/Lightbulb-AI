import OpenAI from 'openai';
import type { APIConfig } from '../types/index.js';

export interface EmotionResult {
  emotion: string;
  intensity: number;
}

const EMOTION_PROMPT = `分析以下角色回复的情绪状态。

## 角色回复
{content}

请从以下情绪中选择最匹配的一个，并给出强度(0.0-1.0)：
开心、伤心、生气、兴奋、担忧、害羞、冷静、惊讶、困惑、骄傲、恐惧、厌恶、轻蔑、中性

输出JSON格式: { "emotion": "情绪名", "intensity": 0.8 }
只输出JSON，不要其他内容。`;

function createOpenAIClient(config: APIConfig): OpenAI {
  const baseURL = config.useProxy && config.proxyEndpoint
    ? config.proxyEndpoint
    : (config.endpoint || 'https://api.openai.com/v1');
  return new OpenAI({ apiKey: config.apiKey, baseURL });
}

export async function detectEmotion(content: string, config: APIConfig): Promise<EmotionResult> {
  try {
    const client = createOpenAIClient(config);
    const prompt = EMOTION_PROMPT.replace('{content}', content);

    const response = await client.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0,
    });

    const text = response.choices[0]?.message?.content?.trim() || '';
    // Extract JSON from possible markdown code block
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        emotion: parsed.emotion || '中性',
        intensity: typeof parsed.intensity === 'number' ? Math.min(1, Math.max(0, parsed.intensity)) : 0.5,
      };
    }
    return { emotion: '中性', intensity: 0.5 };
  } catch {
    return { emotion: '中性', intensity: 0.5 };
  }
}

export function buildSystemPrompt(character: {
  identity: string;
  scene_setting: string;
  language_style: string;
  behavior_rules: string;
}): string {
  return `Reply to me in Chinese only!
${character.identity}

${character.scene_setting}

${character.language_style}

${character.behavior_rules}

重要规则：
- 始终保持角色人设，不要脱离角色
- 回复字数控制在20-50字之间
- 每条回复开头用 [情绪:xxx|强度] 格式标注当前情绪，例如 [情绪:开心|0.8]你好呀！
- 可用的情绪标签：开心、伤心、生气、兴奋、担忧、害羞、冷静、惊讶、困惑、骄傲、恐惧、中性
- 强度范围：0.0-1.0`;
}

export function parseEmotionFromContent(content: string): { content: string; emotion: string | null; emotionIntensity: number | null } {
  const emotionRegex = /^\[情绪:([^\|]+)\|([0-9.]+)\]\s*/;
  const match = content.match(emotionRegex);
  if (match) {
    return {
      content: content.replace(emotionRegex, ''),
      emotion: match[1],
      emotionIntensity: parseFloat(match[2]),
    };
  }
  return { content, emotion: null, emotionIntensity: null };
}
