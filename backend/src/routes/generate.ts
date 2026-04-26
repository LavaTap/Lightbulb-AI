import { Router, Request, Response, NextFunction } from 'express';
import { analyzeSchema, generateImageSchema, generatePosterSchema } from '../middleware/validateRequest.js';
import { analyzeImage } from '../services/visionService.js';
import { generateImage } from '../services/imageGenService.js';
import { generatePoster } from '../services/posterService.js';
import { ZodError } from 'zod';

const router = Router();

// Vision analyze endpoint
router.post('/vision/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imageBase64, config, category } = analyzeSchema.parse(req.body);

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
    
    if (error.code === 'ECONNREFUSED') {
      res.status(502).json({ success: false, error: '无法连接到 API 服务，请检查代理设置' });
    } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      res.status(504).json({ success: false, error: 'API 请求超时，请检查网络连接' });
    } else if (error.status === 401 || error.message?.includes('401')) {
      res.status(401).json({ success: false, error: 'API Key 无效或已过期' });
    } else if (error.status === 429) {
      res.status(429).json({ success: false, error: 'API 请求过于频繁，请稍后重试' });
    } else if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors });
    } else {
      next(error);
    }
  }
});

// Image generate endpoint
router.post('/image/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompt, config, size, referenceImage } = generateImageSchema.parse(req.body);
    
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
    
    if (error.code === 'ECONNREFUSED') {
      res.status(502).json({ success: false, error: '无法连接到 API 服务，请检查代理设置' });
    } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      res.status(504).json({ success: false, error: 'API 请求超时' });
    } else if (error.status === 401) {
      res.status(401).json({ success: false, error: 'API Key 无效' });
    } else if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors });
    } else {
      next(error);
    }
  }
});

// Poster generate endpoint
router.post('/poster/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { images, prompt, config } = generatePosterSchema.parse(req.body);
    
    console.log('[Poster Generate] Starting...');
    
    const { imageBase64, tokenUsage } = await generatePoster(images, prompt, config);
    
    res.json({
      success: true,
      data: { imageBase64 },
      tokenUsage
    });
  } catch (error: any) {
    console.error('[Poster Generate ERROR]', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      res.status(502).json({ success: false, error: '无法连接到 API 服务，请检查代理设置' });
    } else if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors });
    } else {
      next(error);
    }
  }
});

export default router;
