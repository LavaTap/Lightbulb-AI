import { z } from 'zod';

// 分析类别类型
export const analysisCategorySchema = z.enum(['character', 'landscape', 'object', 'other']);
export type AnalysisCategory = z.infer<typeof analysisCategorySchema>;

export const analyzeSchema = z.object({
  imageBase64: z.string().min(1, 'Image is required'),
  config: z.object({
    provider: z.enum(['openai', 'google', 'deepseek', 'xfyun', 'custom']),
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
    provider: z.enum(['openai', 'google', 'deepseek', 'xfyun', 'custom']),
    model: z.string().min(1),
    endpoint: z.string().optional(),
    apiKey: z.string().min(1),
    useProxy: z.boolean().optional(),
    proxyEndpoint: z.string().optional(),
  }),
  size: z.enum(['1024x1024', '1024x1792', '1792x1024']).optional(),
  referenceImage: z.string().optional(),  // 可选参考图 base64，用于图生图
});

export const generatePosterSchema = z.object({
  images: z.array(z.string()).min(1, 'At least one image is required'),
  prompt: z.string().min(1, 'Prompt is required'),
  config: z.object({
    provider: z.enum(['openai', 'google', 'deepseek', 'xfyun', 'custom']),
    model: z.string().min(1),
    endpoint: z.string().optional(),
    apiKey: z.string().min(1),
    useProxy: z.boolean().optional(),
    proxyEndpoint: z.string().optional(),
  })
});

export const createRecordSchema = z.object({
  featureType: z.string().min(1),
  prompt: z.string().optional(),
  uploadImages: z.string().optional(),
  generatedImages: z.string().optional(),
  modelProvider: z.string().min(1),
  modelName: z.string().min(1),
  tokenUsage: z.number().int().min(0),
});
