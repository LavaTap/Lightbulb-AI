"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateConversationSchema = exports.sendMessageSchema = exports.createConversationSchema = exports.createRecordSchema = exports.generatePosterSchema = exports.generateImageSchema = exports.analyzeSchema = exports.analysisCategorySchema = void 0;
const zod_1 = require("zod");
// 分析类别类型
exports.analysisCategorySchema = zod_1.z.enum(['character', 'landscape', 'object', 'other']);
exports.analyzeSchema = zod_1.z.object({
    imageBase64: zod_1.z.string().min(1, 'Image is required'),
    config: zod_1.z.object({
        provider: zod_1.z.enum(['openai', 'google', 'deepseek', 'xfyun', 'aliyun', 'bytedance', 'baidu', 'tencent', 'gptimage2', 'custom']),
        model: zod_1.z.string().min(1),
        endpoint: zod_1.z.string().optional(),
        apiKey: zod_1.z.string().min(1),
        useProxy: zod_1.z.boolean().optional(),
        proxyEndpoint: zod_1.z.string().optional(),
    }),
    category: exports.analysisCategorySchema.optional(), // 分析类型：character/landscape/object/other
});
exports.generateImageSchema = zod_1.z.object({
    prompt: zod_1.z.string().min(1, 'Prompt is required'),
    config: zod_1.z.object({
        provider: zod_1.z.enum(['openai', 'google', 'deepseek', 'xfyun', 'aliyun', 'bytedance', 'baidu', 'tencent', 'gptimage2', 'custom']),
        model: zod_1.z.string().min(1),
        endpoint: zod_1.z.string().optional(),
        apiKey: zod_1.z.string().min(1),
        useProxy: zod_1.z.boolean().optional(),
        proxyEndpoint: zod_1.z.string().optional(),
    }),
    size: zod_1.z.enum(['1024x1024', '1024x1792', '1792x1024', '2560x1440']).optional(),
    referenceImage: zod_1.z.string().optional(), // 可选参考图 base64，用于图生图
});
exports.generatePosterSchema = zod_1.z.object({
    images: zod_1.z.array(zod_1.z.string()).min(1, 'At least one image is required'),
    prompt: zod_1.z.string().min(1, 'Prompt is required'),
    config: zod_1.z.object({
        provider: zod_1.z.enum(['openai', 'google', 'deepseek', 'xfyun', 'aliyun', 'bytedance', 'baidu', 'tencent', 'gptimage2', 'custom']),
        model: zod_1.z.string().min(1),
        endpoint: zod_1.z.string().optional(),
        apiKey: zod_1.z.string().min(1),
        useProxy: zod_1.z.boolean().optional(),
        proxyEndpoint: zod_1.z.string().optional(),
    }),
    size: zod_1.z.enum(['1024x1024', '1024x1792', '1792x1024', '2560x1440']).optional(),
});
exports.createRecordSchema = zod_1.z.object({
    featureType: zod_1.z.string().min(1),
    prompt: zod_1.z.string().optional(),
    uploadImages: zod_1.z.string().optional(),
    generatedImages: zod_1.z.string().optional(),
    uploadImagesOriginal: zod_1.z.string().optional(), // 原图 base64
    generatedImagesOriginal: zod_1.z.string().optional(), // 原图 base64
    modelProvider: zod_1.z.string().min(1),
    modelName: zod_1.z.string().min(1),
    tokenUsage: zod_1.z.number().int().min(0),
});
// Chat schemas
const configSchema = zod_1.z.object({
    provider: zod_1.z.enum(['openai', 'google', 'deepseek', 'xfyun', 'aliyun', 'bytedance', 'baidu', 'tencent', 'gptimage2', 'custom']),
    model: zod_1.z.string().min(1),
    endpoint: zod_1.z.string().optional(),
    apiKey: zod_1.z.string().min(1),
    useProxy: zod_1.z.boolean().optional(),
    proxyEndpoint: zod_1.z.string().optional(),
});
exports.createConversationSchema = zod_1.z.object({
    title: zod_1.z.string().optional(),
    modelProvider: zod_1.z.string().min(1),
    modelName: zod_1.z.string().min(1),
    systemPrompt: zod_1.z.string().optional(),
});
exports.sendMessageSchema = zod_1.z.object({
    content: zod_1.z.string().min(1, '消息内容不能为空'),
    config: configSchema,
    attachments: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        dataBase64: zod_1.z.string(),
        mimeType: zod_1.z.string(),
        fileName: zod_1.z.string(),
    })).optional(),
});
exports.updateConversationSchema = zod_1.z.object({
    title: zod_1.z.string().optional(),
    systemPrompt: zod_1.z.string().optional(),
});
//# sourceMappingURL=validateRequest.js.map