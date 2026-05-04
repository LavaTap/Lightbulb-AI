import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';
import type { APIConfig } from '../types/index.js';

export interface MultimodalContent {
  type: 'image_url' | 'text';
  image_url?: { url: string };
  text?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | MultimodalContent[];
}

function toOpenAIMessages(messages: ChatMessage[]): ChatCompletionMessageParam[] {
  return messages.map(m => ({ role: m.role, content: m.content })) as ChatCompletionMessageParam[];
}

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

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL,
    dangerouslyAllowBrowser: true,
  });
}

export async function chatCompletion(
  messages: ChatMessage[],
  config: APIConfig,
  options?: { maxTokens?: number; temperature?: number }
): Promise<{ content: string; tokenUsage: number }> {
  console.log('========== Chat Completion ==========');
  console.log(`Model: ${config.model}, Messages: ${messages.length}`);
  const attachmentCount = messages.filter(m => Array.isArray(m.content)).length;
  if (attachmentCount > 0) {
    console.log(`Multimodal messages: ${attachmentCount}`);
  }

  const client = createOpenAIClient(config);

  const response = await client.chat.completions.create({
    model: config.model,
    messages: toOpenAIMessages(messages),
    max_tokens: options?.maxTokens || 2000,
    temperature: options?.temperature ?? 0.7,
  });

  const content = response.choices[0]?.message?.content || '';
  const tokenUsage = response.usage?.total_tokens || 0;

  console.log(`Token usage: ${tokenUsage}`);
  return { content, tokenUsage };
}

export async function* chatCompletionStream(
  messages: ChatMessage[],
  config: APIConfig,
  options?: { maxTokens?: number; temperature?: number }
): AsyncGenerator<{ delta: string | null; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  console.log('========== Chat Completion Stream ==========');
  console.log(`Model: ${config.model}, Messages: ${messages.length}`);
  const attachmentCount = messages.filter(m => Array.isArray(m.content)).length;
  if (attachmentCount > 0) {
    console.log(`Multimodal messages: ${attachmentCount}`);
  }

  const client = createOpenAIClient(config);

  const stream = await client.chat.completions.create({
    model: config.model,
    messages: toOpenAIMessages(messages),
    max_tokens: options?.maxTokens || 4000,
    temperature: options?.temperature ?? 0.7,
    stream: true,
    stream_options: { include_usage: true },
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || null;

    const usage = chunk.usage
      ? {
          promptTokens: chunk.usage.prompt_tokens,
          completionTokens: chunk.usage.completion_tokens,
          totalTokens: chunk.usage.total_tokens,
        }
      : undefined;

    yield { delta, usage };
  }
}
