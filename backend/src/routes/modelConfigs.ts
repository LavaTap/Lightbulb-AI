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

// POST detect vision capability
router.post('/detect-vision', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = testConnectionSchema.parse(req.body);
    console.log('[Detect Vision] Starting vision detection for:', data.model);
    
    let hasVision = false;
    let message = '';
    
    if (data.provider === 'google') {
      // Google Gemini: check if model supports vision
      const baseUrl = data.useProxy && data.proxyEndpoint 
        ? data.proxyEndpoint 
        : 'https://generativelanguage.googleapis.com';
      
      try {
        const response = await axios.get(
          `${baseUrl}/v1beta/models/${data.model}?key=${data.apiKey}`,
          { timeout: 10000 }
        );
        
        const supportedGenerationMethods = response.data?.supportedGenerationMethods || [];
        hasVision = supportedGenerationMethods.includes('generateContent');
        message = hasVision ? '模型支持 Vision 多模态' : '模型不支持 Vision 多模态';
      } catch (err: any) {
        message = `Vision 检测失败: ${err.response?.data?.error?.message || err.message}`;
      }
    } else {
      // OpenAI compatible: send vision probe with image_url + unknown variant detection
      let baseUrl = data.endpoint || 'https://api.openai.com/v1';
      if (data.useProxy && data.proxyEndpoint) {
        baseUrl = data.proxyEndpoint;
      }
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (data.apiKey) {
        headers['Authorization'] = `Bearer ${data.apiKey}`;
      }
      
      try {
        const response = await axios.post(
          `${baseUrl}/chat/completions`,
          {
            model: data.model,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' } },
                  { type: 'text', text: 'Reply OK if you can see this image.' }
                ]
              }
            ],
            max_tokens: 20,
          },
          { headers, timeout: 15000 }
        );
        
        hasVision = response.status === 200 && response.data?.choices;
        message = '模型支持 Vision 多模态';
      } catch (err: any) {
        const errorText = err.response?.data?.error?.message || err.message || '';
        if (errorText.includes('image_url') && (errorText.includes('unknown variant') || errorText.includes('unsupported'))) {
          hasVision = false;
          message = '模型不支持 Vision 多模态';
        } else if (err.response?.status === 401) {
          message = 'API Key 无效';
        } else {
          message = `Vision 检测失败: ${errorText}`;
        }
      }
    }
    
    res.json({ success: true, hasVision, message });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors });
    } else {
      next(error);
    }
  }
});

export default router;
