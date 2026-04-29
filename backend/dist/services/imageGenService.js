"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateImage = generateImage;
const openai_1 = __importDefault(require("openai"));
async function generateImage(prompt, config, size = '1024x1024', referenceImage) {
    const model = config.model || 'dall-e-3';
    console.log('\n========== Image Generation Request ==========');
    console.log('[Provider]', config.provider);
    console.log('[Model]', model);
    console.log('[Size]', size);
    console.log('[API Key Prefix]', config.apiKey?.substring(0, 8) + '...');
    console.log('[Endpoint]', config.useProxy ? config.proxyEndpoint : config.endpoint);
    console.log('[Use Proxy]', config.useProxy);
    console.log('[Has Reference Image]', !!referenceImage, referenceImage ? `(${(referenceImage.length / 1024).toFixed(2)} KB)` : '');
    console.log('[Prompt Length]', prompt.length, 'chars');
    console.log('[Prompt]', prompt.substring(0, 300) + (prompt.length > 300 ? '...' : ''));
    console.log('[Request Time]', new Date().toISOString());
    console.log('============================================\n');
    const requestStartTime = Date.now();
    // 判断是否使用阿里云 qwen-image 模型
    if (model.startsWith('qwen-image')) {
        return await generateQwenImage(prompt, config, size, referenceImage);
    }
    // 使用标准的 OpenAI Images API（如 DALL-E）
    const client = createOpenAIClient(config);
    const response = await client.images.generate({
        model,
        prompt,
        n: 1,
        size,
        response_format: 'b64_json',
    });
    const imageBase64 = response.data[0]?.b64_json || '';
    const estimatedTokens = Math.ceil(prompt.length / 4);
    const requestDuration = Date.now() - requestStartTime;
    console.log('\n========== Image Generation Response ==========');
    console.log('[Model]', model);
    console.log('[Image Size]', (imageBase64.length / 1024).toFixed(2), 'KB');
    console.log('[Estimated Tokens]', estimatedTokens);
    console.log('[Duration]', requestDuration + 'ms');
    console.log('[Response Time]', new Date().toISOString());
    console.log('==============================================\n');
    return {
        imageBase64,
        tokenUsage: estimatedTokens
    };
}
/**
 * 生成阿里云 qwen-image 图片
 */
async function generateQwenImage(prompt, config, size, referenceImage) {
    // 映射尺寸
    const sizeMap = {
        '1024x1024': '2048*2048', // 1:1
        '1024x1792': '1536*2688', // 9:16
        '1792x1024': '2688*1536', // 16:9
    };
    const imageSize = sizeMap[size] || '2048*2048';
    // 构建消息内容
    const content = [];
    // 如果有参考图，添加到消息开头
    if (referenceImage) {
        content.push({
            type: 'image_url',
            image_url: {
                url: `data:image/jpeg;base64,${referenceImage}`
            }
        });
    }
    // 添加文本提示词
    content.push({ type: 'text', text: prompt });
    // 构建请求体
    const requestBody = {
        model: config.model,
        input: {
            messages: [
                {
                    role: 'user',
                    content: content
                }
            ]
        },
        parameters: {
            size: imageSize,
            n: 1,
            prompt_extend: referenceImage ? false : true, // 有参考图时禁用提示词扩展
            watermark: false
        }
    };
    console.log('[Qwen Image Request]', JSON.stringify(requestBody, null, 2));
    // 调用阿里云 API
    const baseURL = config.endpoint || 'https://dashscope.aliyuncs.com/api/v1';
    // 检测 endpoint 是否已经包含完整路径
    const fullPath = baseURL.includes('/services/aigc/')
        ? baseURL
        : `${baseURL}/services/aigc/multimodal-generation/generation`;
    console.log('[Qwen API URL]', fullPath);
    const response = await fetch(fullPath, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error('[Qwen Image ERROR]', response.status, response.statusText);
        console.error('[Error Body]', errorText);
        throw new Error(`Qwen Image API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();
    console.log('[Qwen Image Response]', JSON.stringify(data, null, 2));
    // 提取图片 URL
    const imageUrl = data?.output?.choices?.[0]?.message?.content?.[0]?.image;
    if (!imageUrl) {
        throw new Error('Failed to get image URL from Qwen API response');
    }
    // 下载图片并转换为 base64
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    // 获取 token 使用量
    const tokenUsage = data?.usage?.image_count || 1;
    console.log('\n========== Image Generation Response ==========');
    console.log('[Image URL]', imageUrl);
    console.log('[Image Size]', (imageBase64.length / 1024).toFixed(2), 'KB');
    console.log('[Token Usage]', tokenUsage);
    console.log('==============================================\n');
    return {
        imageBase64,
        tokenUsage
    };
}
function createOpenAIClient(config) {
    const baseURL = config.useProxy && config.proxyEndpoint
        ? config.proxyEndpoint
        : config.endpoint || undefined;
    return new openai_1.default({
        apiKey: config.apiKey,
        baseURL,
        dangerouslyAllowBrowser: true,
    });
}
//# sourceMappingURL=imageGenService.js.map