import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import {
  getAllModelConfigs,
  getModelConfigById,
  saveModelConfig,
  updateModelConfig,
  deleteModelConfig,
  setActiveModelConfig,
  getActiveModelConfig,
} from '../database.js';
import { ZodError, z } from 'zod';

const router = Router();

const modelConfigSchema = z.object({
  name: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  apiKey: z.string().optional(),
  endpoint: z.string().optional(),
  useProxy: z.boolean().optional(),
  proxyEndpoint: z.string().optional(),
  category: z.string().optional().default('vision'),
  capabilities: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const testConnectionSchema = z.object({
  provider: z.string(),
  apiKey: z.string(),
  model: z.string(),
  endpoint: z.string().optional(),
  useProxy: z.boolean().optional(),
  proxyEndpoint: z.string().optional(),
});

// GET all model configs
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const configs = await getAllModelConfigs();
    res.json({
      success: true,
      data: configs.map(c => ({
        id: c.id,
        name: c.name,
        provider: c.provider,
        model: c.model,
        apiKey: c.api_key,
        endpoint: c.endpoint,
        useProxy: c.use_proxy === 1,
        proxyEndpoint: c.proxy_endpoint,
        category: c.category,
        capabilities: c.capabilities ? JSON.parse(c.capabilities) : [],
        isActive: c.is_active === 1,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// GET active model config
router.get('/active', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await getActiveModelConfig();
    if (!config) {
      return res.json({ success: true, data: null });
    }
    res.json({
      success: true,
      data: {
        id: config.id,
        name: config.name,
        provider: config.provider,
        model: config.model,
        apiKey: config.api_key,
        endpoint: config.endpoint,
        useProxy: config.use_proxy === 1,
        proxyEndpoint: config.proxy_endpoint,
        category: config.category,
        capabilities: config.capabilities ? JSON.parse(config.capabilities) : [],
        isActive: true,
        createdAt: config.created_at,
        updatedAt: config.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET single model config
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const config = await getModelConfigById(id);
    if (!config) {
      return res.status(404).json({ success: false, error: 'Config not found' });
    }
    res.json({
      success: true,
      data: {
        id: config.id,
        name: config.name,
        provider: config.provider,
        model: config.model,
        apiKey: config.api_key,
        endpoint: config.endpoint,
        useProxy: config.use_proxy === 1,
        proxyEndpoint: config.proxy_endpoint,
        category: config.category,
        capabilities: config.capabilities ? JSON.parse(config.capabilities) : [],
        isActive: config.is_active === 1,
        createdAt: config.created_at,
        updatedAt: config.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST create new model config
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = modelConfigSchema.parse(req.body);
    
    const id = await saveModelConfig({
      name: data.name,
      provider: data.provider,
      model: data.model,
      api_key: data.apiKey || null,
      endpoint: data.endpoint || null,
      use_proxy: data.useProxy ? 1 : 0,
      proxy_endpoint: data.proxyEndpoint || null,
      category: data.category,
      capabilities: data.capabilities ? JSON.stringify(data.capabilities) : null,
      is_active: data.isActive ? 1 : 0,
    });
    
    // If this config is set as active, deactivate others
    if (data.isActive) {
      await setActiveModelConfig(id);
    }
    
    res.json({ success: true, data: { id } });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors });
    } else {
      next(error);
    }
  }
});

// PUT update model config
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const data = modelConfigSchema.partial().parse(req.body);
    
    const existing = await getModelConfigById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Config not found' });
    }
    
    await updateModelConfig(id, {
      name: data.name,
      provider: data.provider,
      model: data.model,
      api_key: data.apiKey,
      endpoint: data.endpoint,
      use_proxy: data.useProxy !== undefined ? (data.useProxy ? 1 : 0) : undefined,
      proxy_endpoint: data.proxyEndpoint,
      category: data.category,
      capabilities: data.capabilities ? JSON.stringify(data.capabilities) : undefined,
      is_active: data.isActive !== undefined ? (data.isActive ? 1 : 0) : undefined,
    });
    
    if (data.isActive) {
      await setActiveModelConfig(id);
    }
    
    res.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors });
    } else {
      next(error);
    }
  }
});

// DELETE model config
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    await deleteModelConfig(id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST set active model
router.post('/:id/activate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    await setActiveModelConfig(id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST test connection
router.post('/test-connection', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = testConnectionSchema.parse(req.body);
    console.log('[Test Connection] Starting test for provider:', data.provider);
    
    let success = false;
    let message = '';
    
    if (data.provider === 'google') {
      // Google: use GET /models?key=apiKey
      const baseUrl = data.useProxy && data.proxyEndpoint 
        ? data.proxyEndpoint 
        : 'https://generativelanguage.googleapis.com';
      const url = `${baseUrl}/v1beta/models?key=${data.apiKey}`;
      
      try {
        const response = await axios.get(url, { timeout: 10000 });
        success = response.status === 200;
        message = 'API 连接成功';
      } catch (err: any) {
        if (err.response?.status === 403) {
          message = 'API Key 无效或无权访问';
        } else if (err.code === 'ECONNREFUSED') {
          message = '无法连接到 API 服务，请检查代理设置';
        } else {
          message = `连接失败: ${err.message}`;
        }
      }
    } else {
      // OpenAI compatible: send minimal text probe
      let baseUrl = data.endpoint || 'https://api.openai.com/v1';
      if (data.useProxy && data.proxyEndpoint) {
        baseUrl = data.proxyEndpoint;
      }
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (data.provider === 'openai') {
        headers['Authorization'] = `Bearer ${data.apiKey}`;
      } else if (data.provider === 'deepseek') {
        headers['Authorization'] = `Bearer ${data.apiKey}`;
      } else if (data.provider === 'xfyun') {
        // 讯飞格式: APIKey:APISecret
        headers['Authorization'] = `Bearer ${data.apiKey}`;
      } else if (data.provider === 'custom') {
        if (data.apiKey) {
          headers['Authorization'] = `Bearer ${data.apiKey}`;
        }
      }
      
      try {
        const response = await axios.post(
          `${baseUrl}/chat/completions`,
          {
            model: data.model,
            messages: [{ role: 'user', content: 'OK' }],
            max_tokens: 10,
          },
          { headers, timeout: 15000 }
        );
        
        success = response.status === 200 && response.data?.choices;
        message = 'API 连接成功';
      } catch (err: any) {
        if (err.response?.status === 401) {
          message = 'API Key 无效';
        } else if (err.response?.status === 404) {
          message = '模型不存在或无权访问';
        } else if (err.code === 'ECONNREFUSED') {
          message = '无法连接到 API 服务，请检查代理设置';
        } else if (err.code === 'ETIMEDOUT') {
          message = 'API 请求超时';
        } else {
          message = `连接失败: ${err.response?.data?.error?.message || err.message}`;
        }
      }
    }
    
    res.json({ success, message });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors });
    } else {
      next(error);
    }
  }
});

// POST detect model capabilities (vision, text-to-image, image-to-image)
router.post('/detect-capabilities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provider, apiKey, model, endpoint, useProxy, proxyEndpoint } = testConnectionSchema.parse(req.body);
    console.log('[Detect Capabilities] Starting detection for:', provider, model);

    const capabilities: string[] = [];
    let category = 'text-to-image'; // 默认类型

    // 构建请求配置
    let baseUrl = endpoint || 'https://api.openai.com/v1';
    if (useProxy && proxyEndpoint) {
      baseUrl = proxyEndpoint;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 根据 provider 设置鉴权
    if (provider === 'google') {
      baseUrl = useProxy && proxyEndpoint ? proxyEndpoint : 'https://generativelanguage.googleapis.com';
    } else if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // 测试 1: 尝试 Vision 能力（发送带图片的请求）
    if (provider !== 'google') {
      try {
        // 测试图片理解能力
        const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='; // 1x1 透明图片
        
        await axios.post(
          `${baseUrl}/chat/completions`,
          {
            model: model,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'Reply with OK' },
                  { type: 'image_url', image_url: { url: `data:image/png;base64,${testImageBase64}`, detail: 'low' } }
                ]
              }
            ],
            max_tokens: 10,
          },
          { headers, timeout: 15000 }
        );
        
        // 如果成功响应，说明支持 Vision
        capabilities.push('vision', 'text');
        category = 'vision';
        console.log('[Detect Capabilities] Vision supported');
      } catch (err: any) {
        const errStr = err.response?.data?.error?.message || err.message || '';
        
        // 检查是否是 vision 相关的错误
        if (errStr.includes('image_url') || errStr.includes('unknown variant') || errStr.includes('vision')) {
          console.log('[Detect Capabilities] Vision not supported (expected for text-only models)');
        } else if (err.response?.status === 401 || err.response?.status === 404) {
          // API 错误，继续检测其他能力
          console.log('[Detect Capabilities] Vision test failed, continuing...');
        }
      }
    } else {
      // Google Gemini 天然支持 vision
      capabilities.push('vision', 'text');
      category = 'vision';
    }

    // 测试 2: 尝试文生图能力（对于特定模型）
    // 注意：文生图通常使用不同的 API 端点，这里通过错误信息推断
    const imageGenModels = ['dall-e-3', 'dall-e-2', 'gpt-image-1', 'imagen-3', 'imagen-4', 'wanx', 'seedance', 'ernie-vilg'];
    if (imageGenModels.some(m => model.toLowerCase().includes(m))) {
      capabilities.push('image-generation');
      // 如果已经有 vision 能力，保持 vision
      if (!capabilities.includes('vision')) {
        category = 'image-to-image';
      }
    }

    // 测试 3: 检查是否支持 image-editing（图生图）
    const imageEditModels = ['gpt-image-1', 'wanx-v1'];
    if (imageEditModels.some(m => model.toLowerCase().includes(m))) {
      if (!capabilities.includes('image-editing')) {
        capabilities.push('image-editing');
      }
    }

    // 如果只有 text 能力
    if (capabilities.length === 0) {
      capabilities.push('text');
    }

    console.log('[Detect Capabilities] Result:', { capabilities, category });

    res.json({
      success: true,
      data: {
        capabilities,
        category,
      }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors });
    } else {
      next(error);
    }
  }
});

export default router;
