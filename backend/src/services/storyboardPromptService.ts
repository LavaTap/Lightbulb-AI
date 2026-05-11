import OpenAI from 'openai';
import type { APIConfig } from '../types/index.js';

const PROVIDER_DEFAULT_ENDPOINTS: Record<string, string> = {
  deepseek: 'https://api.deepseek.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1beta/openai',
  aliyun: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  xfyun: 'https://spark-api-open.xf-yun.com/v1',
  bytedance: 'https://ark.cn-beijing.volces.com/api/v3',
  baidu: 'https://qianfan.baidubce.com/v2',
};

function createOpenAIClient(config: APIConfig): OpenAI {
  const baseURL = config.useProxy && config.proxyEndpoint
    ? config.proxyEndpoint
    : config.endpoint || PROVIDER_DEFAULT_ENDPOINTS[config.provider] || undefined;
  return new OpenAI({ apiKey: config.apiKey, baseURL, dangerouslyAllowBrowser: true });
}

// ====== 模板定义 ======

/** 模板一：通用纯场景生图模板（仅场景，不含人物） */
const SCENE_TEMPLATE = `## 通用纯场景生图模板（仅场景，不含人物）

风格描述：统一 {用户要求的风格}，轮廓线条清晰流畅，场景核心元素肌理纹理自然真实，光影层次丰富，明暗过渡自然，整体氛围感浓厚，禁止卡通化、夸张化处理。
背景细节：核心元素样式、结构贴合本次创作主题与{场景类型}需求，装饰细节丰富不杂乱，整体构图协调，无多余冗余元素。
环境搭配：适配整体氛围的光影、天气、环境特效、气场氛围，贴合场景基调，不突兀、不杂乱。
画面参数：画面比例适配全景展示，画质 4K 超清，画面锐度高，场景建筑、地貌、细节元素清晰可辨，无杂色、无多余干扰元素，适配后期叠加任意角色使用。
底色要求：纯白色背景，无人物、无多余杂物入镜。`;

/** 模板二：随机型通用九宫格分镜模板 */
const RANDOM_STORYBOARD_TEMPLATE = `## 随机型通用九宫格分镜模板

基于参考场景图，生成 16:9 比例单张 3×3 九宫格总图，全程统一 {用户要求的风格}。
设定固定环境氛围：由 AI 自主编排从{开局状态}到{核心冲突}再到{结局状态}的完整连贯动作分镜。
人物状态：角色全程保持（离地飞行 / 原地伫立 / 浮空对峙）状态。
镜头规则：采用俯视、特写、中远景、侧拍、近景随机组合，9 个格子视角完全不重复。
画面一致性：严格保持角色长相、服饰材质、光影色调、画风全程统一不变。
格式规范：九宫格以细白线分隔，每格左下角标注数字 1-9，除编号外无任何文字水印、多余图案。`;

/** 模板三：自适应指定型通用九宫格分镜模板 */
const ADAPTIVE_STORYBOARD_TEMPLATE = `## 自适应指定型通用九宫格分镜模板

基于参考角色图、参考场景图，生成 16:9 比例单张 3×3 九宫格 CG 写实总图。
整体规则：9 个画面严格按数字 1-9 顺序排布，镜头间以流畅高速动作自然衔接，完全依据用户给出的题材设定、人物能力、{过程逻辑}、环境氛围，智能创作整套 9 格连贯分镜叙事，完整演绎用户输入的角色个数从{开局状态}{过程描述}到{结局状态}的全过程。
环境固定：全程锁定设定好的天气、氛围与场景基调，角色全程保持设定姿态（飞行 / 浮空 / 站立），完整还原参考场景所有建筑、地貌、标志性景观。
镜头强制要求：9 格视角全部不重复，必须涵盖俯视视角、特写镜头、中远景、侧拍、近景多维度运镜。
角色还原强制：严格复刻保留角色五官长相、服装材质、光影质感、专属武器、能力设定、外形特征全程不变。
格式强制：格子之间用细白线分隔，每格左下角标注对应数字 1-9，整张画面不得添加任何额外文字水印、装饰元素。`;

export type StoryboardPromptMode = 'dialogue' | 'battle';
export type StoryboardTemplate = 'scene' | 'random' | 'adaptive';

// ====== 根据 mode 生成场景描述映射 ======
function getModeContext(mode: StoryboardPromptMode): {
  sceneType: string;
  openingState: string;
  coreConflict: string;
  endingState: string;
  processDesc: string;
  processLogic: string;
} {
  if (mode === 'battle') {
    return {
      sceneType: '对战场景',
      openingState: '对峙',
      coreConflict: '交锋攻防',
      endingState: '最终决胜分出胜负',
      processDesc: '激烈交手',
      processLogic: '对战逻辑',
    };
  }
  // dialogue
  return {
    sceneType: '对话场景',
    openingState: '初遇',
    coreConflict: '交流互动',
    endingState: '关系变化或达成共识',
    processDesc: '深入交流',
    processLogic: '对话逻辑',
  };
}

function fillTemplate(template: string, style: string, modeCtx: ReturnType<typeof getModeContext>): string {
  return template
    .replace('{用户要求的风格}', style)
    .replace('{场景类型}', modeCtx.sceneType)
    .replace('{开局状态}', modeCtx.openingState)
    .replace('{核心冲突}', modeCtx.coreConflict)
    .replace('{结局状态}', modeCtx.endingState)
    .replace('{过程描述}', modeCtx.processDesc)
    .replace('{过程逻辑}', modeCtx.processLogic);
}

// ====== 单个模板的 system prompt 构建 ======
function buildSinglePrompt(
  template: StoryboardTemplate,
  userText: string,
  mode: StoryboardPromptMode,
): string {
  const modeCtx = getModeContext(mode);
  const templateLabel: Record<StoryboardTemplate, string> = {
    scene: '场景生图模板',
    random: '随机分镜模板',
    adaptive: '自适应分镜模板',
  };

  let templateContent: string;
  switch (template) {
    case 'scene':
      templateContent = fillTemplate(SCENE_TEMPLATE, '用户要求的风格', modeCtx);
      break;
    case 'random':
      templateContent = fillTemplate(RANDOM_STORYBOARD_TEMPLATE, '用户要求的风格', modeCtx);
      break;
    case 'adaptive':
      templateContent = fillTemplate(ADAPTIVE_STORYBOARD_TEMPLATE, '用户要求的风格', modeCtx);
      break;
  }

  return `你是一个专业的分镜提示词填写助手。你只负责根据用户的需求文本，将下方给定的模板中的 {占位符} 替换为符合用户需求的具体描述，输出一份完整可直接用的提示词。

用户需求模式：${mode === 'battle' ? '对战/战斗场景' : '对话/交流场景'}

用户需求文本：
${userText}

请填写的模板（${templateLabel[template]}）：
${templateContent}

只输出填充后的提示词文本，不要包含任何额外解释、不要添加引号包裹、不要加 markdown 格式。直接输出提示词正文。`;
}

export interface SinglePromptResult {
  scenePrompt: string;
  randomStoryboardPrompt: string;
  adaptiveStoryboardPrompt: string;
}

export async function generateStoryboardPrompt(
  userText: string,
  config: APIConfig,
  template: StoryboardTemplate,
  mode: StoryboardPromptMode,
): Promise<{ result: SinglePromptResult; tokenUsage: number }> {
  console.log('========== Storyboard Prompt Generation ==========');
  console.log(`Model: ${config.model}, Template: ${template}, Mode: ${mode}`);

  const client = createOpenAIClient(config);
  const systemPrompt = buildSinglePrompt(template, userText, mode);

  const response = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请根据我的需求，填充${template === 'scene' ? '场景生图' : template === 'random' ? '随机分镜' : '自适应分镜'}模板。` },
    ],
    max_tokens: 4096,
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content || '';
  const tokenUsage = response.usage?.total_tokens || 0;

  console.log(`Token usage: ${tokenUsage}`);

  // 根据生成的模板类型，拼装到对应字段
  const result: SinglePromptResult = {
    scenePrompt: '',
    randomStoryboardPrompt: '',
    adaptiveStoryboardPrompt: '',
  };

  if (template === 'scene') result.scenePrompt = content.trim();
  else if (template === 'random') result.randomStoryboardPrompt = content.trim();
  else if (template === 'adaptive') result.adaptiveStoryboardPrompt = content.trim();

  if (!result.scenePrompt && !result.randomStoryboardPrompt && !result.adaptiveStoryboardPrompt) {
    throw new Error('AI 返回结果为空');
  }

  return { result, tokenUsage };
}
