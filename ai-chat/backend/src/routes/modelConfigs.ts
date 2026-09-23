import { Router, Request, Response } from 'express';
import {
  getAllModelConfigs,
  getModelConfigById,
  getActiveModelConfig,
  saveModelConfig,
  updateModelConfig,
  deleteModelConfig,
  setActiveModelConfig,
} from '../database.js';

const router = Router();

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function formatConfig(c: any) {
  return {
    id: c.id,
    name: c.name,
    provider: c.provider,
    model: c.model,
    apiKey: c.api_key,
    endpoint: c.endpoint,
    useProxy: !!c.use_proxy,
    proxyEndpoint: c.proxy_endpoint,
    category: c.category,
    capabilities: c.capabilities ? JSON.parse(c.capabilities) : [],
    isActive: !!c.is_active,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const configs = await getAllModelConfigs();
    res.json({ success: true, data: configs.map(formatConfig) });
  } catch (error) {
    res.status(500).json({ error: extractErrorMessage(error) });
  }
});

router.get('/active', async (_req: Request, res: Response) => {
  try {
    const config = await getActiveModelConfig();
    if (!config) return res.json({ success: true, data: null });
    res.json({ success: true, data: formatConfig(config) });
  } catch (error) {
    res.status(500).json({ error: extractErrorMessage(error) });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const config = await getModelConfigById(Number(req.params.id));
    if (!config) return res.status(404).json({ error: '配置不存在' });
    res.json({ success: true, data: formatConfig(config) });
  } catch (error) {
    res.status(500).json({ error: extractErrorMessage(error) });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, provider, model, apiKey, endpoint, useProxy, proxyEndpoint, category, capabilities, isActive } = req.body;
    if (!name || !provider || !model) return res.status(400).json({ error: '缺少必填字段' });
    const id = await saveModelConfig({
      name,
      provider,
      model,
      api_key: apiKey || null,
      endpoint: endpoint || null,
      use_proxy: useProxy ? 1 : 0,
      proxy_endpoint: proxyEndpoint || null,
      category: category || 'text',
      capabilities: capabilities ? JSON.stringify(capabilities) : null,
      is_active: isActive ? 1 : 0,
    });
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ error: extractErrorMessage(error) });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { name, provider, model, apiKey, endpoint, useProxy, proxyEndpoint, category, capabilities, isActive } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (provider !== undefined) data.provider = provider;
    if (model !== undefined) data.model = model;
    if (apiKey !== undefined) data.api_key = apiKey;
    if (endpoint !== undefined) data.endpoint = endpoint;
    if (useProxy !== undefined) data.use_proxy = useProxy ? 1 : 0;
    if (proxyEndpoint !== undefined) data.proxy_endpoint = proxyEndpoint;
    if (category !== undefined) data.category = category;
    if (capabilities !== undefined) data.capabilities = JSON.stringify(capabilities);
    if (isActive !== undefined) data.is_active = isActive ? 1 : 0;
    await updateModelConfig(id, data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: extractErrorMessage(error) });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteModelConfig(Number(req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: extractErrorMessage(error) });
  }
});

router.post('/:id/activate', async (req: Request, res: Response) => {
  try {
    await setActiveModelConfig(Number(req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: extractErrorMessage(error) });
  }
});

export default router;
