import { Router, Request, Response } from 'express';
import { analyzeSchema, generateImageSchema, generatePosterSchema, generateStoryboardSchema, generateStoryboardPromptSchema } from '../middleware/validateRequest.js';
import { analyzeImage } from '../services/visionService.js';
import { generateImage } from '../services/imageGenService.js';
import { generatePoster } from '../services/posterService.js';
import { generateStoryboard } from '../services/storyboardService.js';
import { generateStoryboardPrompt } from '../services/storyboardPromptService.js';
import { ZodError } from 'zod';
import type { APIConfig } from '../types/index.js';

function toAPIConfig(data: any): APIConfig {
  return {
    provider: data.provider,
    model: data.model,
    endpoint: data.endpoint || '',
    apiKey: data.apiKey,
    useProxy: data.useProxy || false,
    proxyEndpoint: data.proxyEndpoint || '',
  };
}

const router = Router();

/**
 * 从错误对象中提取可读的错误信息
 * 优先级: response.body > response.data.error.message > error.message > fallback
 */
function extractErrorMessage(error: any): string {
  // Axios 风格错误 (response.data)
  if (error.response?.data) {
    const data = error.response.data;
    if (typeof data === 'string') return data;
    if (data.error) {
      if (typeof data.error === 'string') return data.error;
      if (data.error?.message) return data.error.message;
      if (Array.isArray(data.error)) return data.error.map((e: any) => e.message || JSON.stringify(e)).join('; ');
    }
    if (data.message) return data.message;
  }
  
  // OpenAI SDK 风格错误
  if (error.message) return error.message;
  
  // HTTP status + statusText
  if (error.response?.status && error.response?.statusText) {
    return `HTTP ${error.response.status}: ${error.response.statusText}`;
  }
  
  return '未知错误，请查看后端日志';
}

// Vision analyze endpoint
router.post('/vision/analyze', async (req: Request, res: Response) => {
  try {
    const { imageBase64, config: rawConfig, category } = analyzeSchema.parse(req.body);
    const config = toAPIConfig(rawConfig);

    console.log('[Vision Analyze] Starting...');
    console.log('[Config]', JSON.stringify({
      provider: config.provider,
      model: config.model,
      endpoint: config.endpoint,
      hasApiKey: !!config.apiKey,
      useProxy: config.useProxy,
      proxyEndpoint: config.proxyEndpoint,
      category: category || 'other (default)'
    }));

    const { result, tokenUsage } = await analyzeImage(imageBase64, config, category);
    
    res.json({
      success: true,
      data: result,
      tokenUsage
    });
  } catch (error: any) {
    console.error('[Vision Analyze ERROR]', error.message);
    console.error('[Stack]', error.stack);
    
    // 提取详细错误信息
    const errorMessage = extractErrorMessage(error);
    
    if (error.code === 'ECONNREFUSED') {
      res.status(502).json({ success: false, error: '无法连接到 API 服务，请检查代理设置', detail: errorMessage });
    } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      res.status(504).json({ success: false, error: 'API 请求超时，请检查网络连接', detail: errorMessage });
    } else if (error.status === 401 || error.message?.includes('401')) {
      res.status(401).json({ success: false, error: 'API Key 无效或已过期', detail: errorMessage });
    } else if (error.status === 429) {
      res.status(429).json({ success: false, error: 'API 请求过于频繁，请稍后重试', detail: errorMessage });
    } else if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors });
    } else if (error.status || error.response?.status) {
      const statusCode = error.status || error.response?.status;
      res.status(statusCode).json({ success: false, error: errorMessage });
    } else {
      res.status(500).json({ success: false, error: errorMessage });
    }
  }
});

// Image generate endpoint
router.post('/image/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, config: rawConfig, size, referenceImage } = generateImageSchema.parse(req.body);
    const config = toAPIConfig(rawConfig);

    console.log('[Image Generate] Starting...');
    console.log('[Config]', JSON.stringify({
      provider: config.provider,
      model: config.model,
      endpoint: config.endpoint,
      hasApiKey: !!config.apiKey,
      useProxy: config.useProxy
    }));
    console.log('[Has Reference Image]', !!referenceImage, referenceImage ? `(${(referenceImage.length / 1024).toFixed(2)} KB)` : '');
    
    const { imageBase64, tokenUsage } = await generateImage(prompt, config, size, referenceImage);
    
    res.json({
      success: true,
      data: { imageBase64 },
      tokenUsage
    });
  } catch (error: any) {
    console.error('[Image Generate ERROR]', error.message);
    console.error('[Stack]', error.stack);
    
    // 提取详细错误信息
    const errorMessage = extractErrorMessage(error);
    
    if (error.code === 'ECONNREFUSED') {
      res.status(502).json({ success: false, error: '无法连接到 API 服务，请检查代理设置', detail: errorMessage });
    } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      res.status(504).json({ success: false, error: 'API 请求超时', detail: errorMessage });
    } else if (error.status === 401) {
      res.status(401).json({ success: false, error: 'API Key 无效', detail: errorMessage });
    } else if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors });
    } else if (error.status || error.response?.status) {
      const statusCode = error.status || error.response?.status;
      res.status(statusCode).json({ success: false, error: errorMessage });
    } else {
      res.status(500).json({ success: false, error: errorMessage });
    }
  }
});

// Poster generate endpoint
router.post('/poster/generate', async (req: Request, res: Response) => {
  try {
    const { images, prompt, config: rawConfig, size } = generatePosterSchema.parse(req.body);
    const config = toAPIConfig(rawConfig);

    console.log('[Poster Generate] Starting...');

    const { imageBase64, tokenUsage } = await generatePoster(images, prompt, config, size);
    
    res.json({
      success: true,
      data: { imageBase64 },
      tokenUsage
    });
  } catch (error: any) {
    console.error('[Poster Generate ERROR]', error.message);
    console.error('[Stack]', error.stack);
    
    // 提取详细错误信息
    const errorMessage = extractErrorMessage(error);
    
    if (error.code === 'ECONNREFUSED') {
      res.status(502).json({ success: false, error: '无法连接到 API 服务，请检查代理设置', detail: errorMessage });
    } else if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors });
    } else if (error.status || error.response?.status) {
      const statusCode = error.status || error.response?.status;
      res.status(statusCode).json({ success: false, error: errorMessage });
    } else {
      res.status(500).json({ success: false, error: errorMessage });
    }
  }
});

// Storyboard generate endpoint
router.post('/storyboard/generate', async (req: Request, res: Response) => {
  try {
    const { characterImages, sceneImage, prompt, config: rawConfig } = generateStoryboardSchema.parse(req.body);
    const config = toAPIConfig(rawConfig);

    console.log('[Storyboard Generate] Starting...');

    const { imageBase64, tokenUsage } = await generateStoryboard(
      characterImages,
      sceneImage,
      prompt,
      config
    );

    res.json({
      success: true,
      data: { imageBase64 },
      tokenUsage
    });
  } catch (error: any) {
    console.error('[Storyboard Generate ERROR]', error.message);
    console.error('[Stack]', error.stack);

    // 提取详细错误信息
    const errorMessage = extractErrorMessage(error);

    if (error.code === 'ECONNREFUSED') {
      res.status(502).json({ success: false, error: '无法连接到 API 服务，请检查代理设置', detail: errorMessage });
    } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      res.status(504).json({ success: false, error: 'API 请求超时，请检查网络连接', detail: errorMessage });
    } else if (error.status === 401) {
      res.status(401).json({ success: false, error: 'API Key 无效', detail: errorMessage });
    } else if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors });
    } else if (error.status || error.response?.status) {
      const statusCode = error.status || error.response?.status;
      res.status(statusCode).json({ success: false, error: errorMessage });
    } else {
      res.status(500).json({ success: false, error: errorMessage });
    }
  }
});

// Storyboard prompt generate endpoint (分镜词分析)
router.post('/storyboard-prompt/generate', async (req: Request, res: Response) => {
  try {
    const { text, config: rawConfig, template, mode } = generateStoryboardPromptSchema.parse(req.body);
    const config = toAPIConfig(rawConfig);

    console.log('[Storyboard Prompt] Starting...');
    console.log(`[Template] ${template}, [Mode] ${mode}`);

    const { result, tokenUsage } = await generateStoryboardPrompt(text, config, template, mode);

    res.json({
      success: true,
      data: result,
      tokenUsage
    });
  } catch (error: any) {
    console.error('[Storyboard Prompt ERROR]', error.message);
    console.error('[Stack]', error.stack);

    const errorMessage = extractErrorMessage(error);

    if (error.code === 'ECONNREFUSED') {
      res.status(502).json({ success: false, error: '无法连接到 API 服务，请检查代理设置', detail: errorMessage });
    } else if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors });
    } else if (error.status || error.response?.status) {
      const statusCode = error.status || error.response?.status;
      res.status(statusCode).json({ success: false, error: errorMessage });
    } else {
      res.status(500).json({ success: false, error: errorMessage });
    }
  }
});

export default router;
