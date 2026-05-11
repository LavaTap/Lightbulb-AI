import { z } from 'zod';

// 分析类别类型
export const analysisCategorySchema = z.enum(['character', 'landscape', 'object', 'other']);
export type AnalysisCategory = z.infer<typeof analysisCategorySchema>;

export const analyzeSchema = z.object({
  imageBase64: z.string().min(1, 'Image is required'),
  config: z.object({
    provider: z.enum(['openai', 'google', 'deepseek', 'xfyun', 'aliyun', 'bytedance', 'baidu', 'tencent', 'gptimage2', 'custom']),
    model: z.string().min(1),
    endpoint: z.string().optional(),
    apiKey: z.string().min(1),
    useProxy: z.boolean().optional(),
    proxyEndpoint: z.string().optional(),
  }),
  category: analysisCategorySchema.optional(),  // 分析类型：character/landscape/object/other
});

export const generateImageSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  config: z.object({
    provider: z.enum(['openai', 'google', 'deepseek', 'xfyun', 'aliyun', 'bytedance', 'baidu', 'tencent', 'gptimage2', 'custom']),
    model: z.string().min(1),
    endpoint: z.string().optional(),
    apiKey: z.string().min(1),
    useProxy: z.boolean().optional(),
    proxyEndpoint: z.string().optional(),
  }),
  size: z.enum(['1024x1024', '1024x1792', '1792x1024', '2560x1440']).optional(),
  referenceImage: z.union([z.string(), z.array(z.string())]).optional(),  // 可选参考图 base64，支持单张或多张
});

export const generatePosterSchema = z.object({
  images: z.array(z.string()).min(1, 'At least one image is required'),
  prompt: z.string().min(1, 'Prompt is required'),
  config: z.object({
    provider: z.enum(['openai', 'google', 'deepseek', 'xfyun', 'aliyun', 'bytedance', 'baidu', 'tencent', 'gptimage2', 'custom']),
    model: z.string().min(1),
    endpoint: z.string().optional(),
    apiKey: z.string().min(1),
    useProxy: z.boolean().optional(),
    proxyEndpoint: z.string().optional(),
  }),
  size: z.enum(['1024x1024', '1024x1792', '1792x1024', '2560x1440']).optional(),
});

export const generateStoryboardSchema = z.object({
  characterImages: z.array(z.string()),
  sceneImage: z.string().optional(),
  prompt: z.string().min(1, '分镜描述不能为空'),
  config: z.object({
    provider: z.enum(['openai', 'google', 'deepseek', 'xfyun', 'aliyun', 'bytedance', 'baidu', 'tencent', 'gptimage2', 'custom']),
    model: z.string().min(1),
    endpoint: z.string().optional(),
    apiKey: z.string().min(1),
    useProxy: z.boolean().optional(),
    proxyEndpoint: z.string().optional(),
  }),
});

export const generateStoryboardPromptSchema = z.object({
  text: z.string().min(1, '需求文本不能为空'),
  config: z.object({
    provider: z.enum(['openai', 'google', 'deepseek', 'xfyun', 'aliyun', 'bytedance', 'baidu', 'tencent', 'gptimage2', 'custom']),
    model: z.string().min(1),
    endpoint: z.string().optional(),
    apiKey: z.string().min(1),
    useProxy: z.boolean().optional(),
    proxyEndpoint: z.string().optional(),
  }),
  template: z.enum(['scene', 'random', 'adaptive']),
  mode: z.enum(['dialogue', 'battle']),
});

export const createRecordSchema = z.object({
  featureType: z.string().min(1),
  prompt: z.string().optional(),
  uploadImages: z.string().optional(),
  generatedImages: z.string().optional(),
  uploadImagesOriginal: z.string().optional(),    // 原图 base64
  generatedImagesOriginal: z.string().optional(), // 原图 base64
  modelProvider: z.string().min(1),
  modelName: z.string().min(1),
  tokenUsage: z.number().int().min(0),
});

// Chat schemas
const configSchema = z.object({
  provider: z.enum(['openai', 'google', 'deepseek', 'xfyun', 'aliyun', 'bytedance', 'baidu', 'tencent', 'gptimage2', 'custom']),
  model: z.string().min(1),
  endpoint: z.string().optional(),
  apiKey: z.string().min(1),
  useProxy: z.boolean().optional(),
  proxyEndpoint: z.string().optional(),
});

export const createConversationSchema = z.object({
  title: z.string().optional(),
  modelProvider: z.string().min(1),
  modelName: z.string().min(1),
  systemPrompt: z.string().optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1, '消息内容不能为空'),
  config: configSchema,
  attachments: z.array(z.object({
    type: z.string(),
    dataBase64: z.string(),
    mimeType: z.string(),
    fileName: z.string(),
  })).optional(),
});

export const updateConversationSchema = z.object({
  title: z.string().optional(),
  systemPrompt: z.string().optional(),
});
