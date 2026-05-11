import OpenAI from 'openai';
import crypto from 'crypto';
import type { APIConfig } from '../types/index.js';

/**
 * 腾讯云 TC3-HMAC-SHA256 签名
 * 参考: https://cloud.tencent.com/document/api/213/30654
 */
function signTc3(
  secretKey: string,
  service: string,
  timestamp: number,
  dateStr: string,
  payload: string,
  headers: Record<string, string>
): string {
  // Step 1: 拼接 CanonicalRequest
  const method = 'POST';
  const canonicalUri = '/';
  const canonicalQueryString = '';
  const signedHeaders = Object.keys(headers).map(h => h.toLowerCase()).sort().join(';');
  const canonicalHeaders = Object.entries(headers)
    .sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map(([k, v]) => `${k.toLowerCase()}:${v}\n`)
    .join('');

  const hashedPayload = crypto.createHash('sha256').update(payload).digest('hex');
  const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedPayload}`;

  // Step 2: 拼接待签字符串
  const algorithm = 'TC3-HMAC-SHA256';
  const credentialScope = `${dateStr}/${service}/tc3_request`;
  const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
  const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

  // Step 3: 计算签名
  const secretDate = crypto.createHmac('sha256', `TC3${secretKey}`).update(dateStr).digest();
  const secretService = crypto.createHmac('sha256', secretDate).update(service).digest();
  const secretSigning = crypto.createHmac('sha256', secretService).update('tc3_request').digest();
  const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');

  return `${algorithm} Credential=${headers['X-TC-Key'] || ''}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

export type ImageSize = '1024x1024' | '1024x1792' | '1792x1024' | '2560x1440';

export async function generateImage(
  prompt: string,
  config: APIConfig,
  size: ImageSize = '1024x1024',
  referenceImage?: string
): Promise<{ imageBase64: string; tokenUsage: number }> {
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

  // 判断是否使用腾讯混元模型（hy-image 前缀 或 endpoint 含 tokenhub 的 hy 系列模型）
  if (model.startsWith('hy-image') || (model.startsWith('hy') && config.endpoint?.includes('tokenhub'))) {
    return await generateTencentHunyuan(prompt, config, size, referenceImage);
  }

  // 判断是否使用 gpt-image-2 模型（gptimage2 代理 API，异步提交+轮询）
  if (model === 'gpt-image-2' || config.provider === 'gptimage2') {
    return await generateGptImage2(prompt, config, size, referenceImage);
  }

  // 使用标准的 OpenAI Images API（如 DALL-E）
  const client = createOpenAIClient(config);
  
  const response = await client.images.generate({
    model,
    prompt,
    n: 1,
    size: size as any,
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
async function generateQwenImage(
  prompt: string,
  config: APIConfig,
  size: ImageSize,
  referenceImage?: string
): Promise<{ imageBase64: string; tokenUsage: number }> {
  // 映射尺寸（仅当需要指定尺寸时使用）
  const sizeMap: Record<string, string> = {
    '1024x1024': '2048*2048',  // 1:1
    '1024x1792': '1536*2688',  // 9:16
    '1792x1024': '2688*1536',  // 16:9
    '2560x1440': '2560*1440',  // 2K 16:9
  };
  
  // 构建消息内容
  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
  
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
  
  // 构建请求体 — 不传 size，优先按对话 prompt 中的尺寸要求
  const requestBody: Record<string, any> = {
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
      n: 1,
      prompt_extend: referenceImage ? false : true,  // 有参考图时禁用提示词扩展
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

/**
 * 生成腾讯混元图片
 * 
 * 两种接入方式：
 * 1. 腾讯云标准 API（默认）：aiart.tencentcloudapi.com，使用 TC3-HMAC-SHA256 签名
 * 2. TokenHub OpenAI 兼容 API：tokenhub.tencentmaas.com，使用 Bearer Token
 * 
 * - hy-image-lite: 极速版（TextToImageLite）
 * - hy-image-v3.0: 3.0 版（异步提交 SubmitTextToImageJob + 轮询 QueryTextToImageJob）
 */
async function generateTencentHunyuan(
  prompt: string,
  config: APIConfig,
  size: ImageSize,
  referenceImage?: string
): Promise<{ imageBase64: string; tokenUsage: number }> {
  const endpoint = config.endpoint || 'https://aiart.tencentcloudapi.com';
  const model = config.model;

  // 判断是否使用 TokenHub 方式（endpoint 包含 tokenhub）
  if (endpoint.includes('tokenhub')) {
    return await generateTencentTokenHub(prompt, config, size, referenceImage);
  }

  // ---- 腾讯云标准 API 方式 ----
  const [secretId, secretKey] = (config.apiKey || '').split(':');
  if (!secretId || !secretKey) {
    throw new Error('腾讯云 API Key 格式错误，请使用 SecretId:SecretKey 格式');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const dateStr = new Date().toISOString().replace(/[-:]/g, '').split('T')[0]; // YYYYMMDD
  const service = 'aiart';

  const isLiteModel = model.includes('lite') || model.includes('Lite');
  const isAsyncModel = model.includes('v3') || model.includes('3.0') || model.includes('preview');

  if (isLiteModel) {
    // 混元生图极速版 - TextToImageLite
    console.log('[Tencent Hunyuan Lite] Using standard API...');

    // 尺寸映射
    const resolutionMap: Record<string, string> = {
      '1024x1024': '1024:1024',
      '1024x1792': '768:1344',  // 9:16 近似
      '1792x1024': '1344:768',  // 16:9 近似
      '2560x1440': '2560:1440', // 2K 16:9
    };

    const payload: Record<string, any> = {
      Prompt: prompt,
      RspImgType: 'url',
      Resolution: resolutionMap[size] || '1024:1024',
      LogoAdd: 0,
    };

    const payloadStr = JSON.stringify(payload);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-TC-Action': 'TextToImageLite',
      'X-TC-Key': secretId,
      'X-TC-Timestamp': String(timestamp),
      'X-TC-Version': '2022-12-29',
      'X-TC-Region': 'ap-guangzhou',
    };

    const authorization = signTc3(secretKey, service, timestamp, dateStr, payloadStr, headers);
    headers['Authorization'] = authorization;

    console.log('[Tencent Hunyuan Lite] Request headers:', JSON.stringify(headers, null, 2));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: payloadStr,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Tencent Hunyuan Lite ERROR]', response.status, errorText);
      throw new Error(`Tencent Hunyuan Lite API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[Tencent Hunyuan Lite Response]', JSON.stringify(data, null, 2));

    if (data.Response?.Error) {
      throw new Error(`腾讯混元 API 错误: ${data.Response.Error.Code} - ${data.Response.Error.Message}`);
    }

    const imageUrl = data.Response?.ResultImage;
    if (!imageUrl) throw new Error('Failed to get image URL from Hunyuan Lite response');

    // 下载图片并转换为 base64
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');

    console.log('[Tencent Hunyuan Lite] Success, image size:', (imageBase64.length / 1024).toFixed(2), 'KB');
    return { imageBase64, tokenUsage: 1 };
  }

  // 异步模型（如 hy-image-v3.0 / hy3-preview）暂不支持标准 API 方式（需要异步任务处理）
  throw new Error(`混元模型 ${model} 暂不支持标准 API，请使用自定义 endpoint 接入 TokenHub（https://tokenhub.tencentmaas.com/v1/api/image）`);
}

/**
 * 通过 TokenHub OpenAI 兼容接口调用腾讯混元
 */
async function generateTencentTokenHub(
  prompt: string,
  config: APIConfig,
  size: ImageSize,
  referenceImage?: string
): Promise<{ imageBase64: string; tokenUsage: number }> {
  const baseURL = (config.endpoint || 'https://tokenhub.tencentmaas.com/v1/api/image')
    .replace(/\/lite\/?$/, '')    // 用户可能把 endpoint 填成了 /lite 完整路径
    .replace(/\/submit\/?$/, '')
    .replace(/\/query\/?$/, '')
    .replace(/\/$/, '');          // 去掉尾部斜杠
  const model = config.model;

  // 判断模型类型：Lite（极速版）还是异步版
  const isLiteModel = model.includes('lite') || model.includes('Lite');

  if (isLiteModel) {
    console.log(`[Tencent Hunyuan TokenHub] Lite: Calling API with model=${model}...`);

    const response = await fetch(`${baseURL}/lite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,  // 使用用户配置的实际模型 ID
        prompt,
        rsp_img_type: 'url',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Tencent Hunyuan TokenHub Lite ERROR]', response.status, errorText);
      throw new Error(`Tencent Hunyuan Lite API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;
    if (!imageUrl) throw new Error('Failed to get image URL from Hunyuan Lite response');

    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');

    console.log('[Tencent Hunyuan TokenHub Lite] Success, image size:', (imageBase64.length / 1024).toFixed(2), 'KB');
    return { imageBase64, tokenUsage: 1 };
  }

  // 异步接口（提交 + 轮询查询），适用于 hy-image-v3.0 / hy3-preview 等模型
  console.log(`[Tencent Hunyuan TokenHub] Async: Submitting task with model=${model}...`);

  const submitBody: Record<string, any> = {
    model,  // 使用用户配置的实际模型 ID
    prompt,
  };

  if (referenceImage) {
    submitBody.images = [`data:image/jpeg;base64,${referenceImage}`];
  }

  const submitRes = await fetch(`${baseURL}/submit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(submitBody),
  });

  if (!submitRes.ok) {
    const errorText = await submitRes.text();
    throw new Error(`Tencent Hunyuan Submit Error: ${submitRes.status} - ${errorText}`);
  }

  const submitData = await submitRes.json();
  const jobId = submitData.id;
  if (!jobId) throw new Error('Failed to get job ID from Hunyuan submit response');

  console.log('[Tencent Hunyuan TokenHub] Job submitted, ID:', jobId);

  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000));

    const queryRes = await fetch(`${baseURL}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, id: jobId }),
    });

    if (!queryRes.ok) continue;

    const queryData = await queryRes.json();

    if (queryData.status === 'completed') {
      const imageUrl = queryData.data?.[0]?.url;
      if (!imageUrl) throw new Error('No image URL in completed response');

      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');

      console.log(`[Tencent Hunyuan TokenHub] Success (${model}), image size:`, (imageBase64.length / 1024).toFixed(2), 'KB');
      return { imageBase64, tokenUsage: 1 };
    }

    if (queryData.status === 'failed') {
      throw new Error(`Tencent Hunyuan (${model}) image generation failed`);
    }
  }

  throw new Error(`Tencent Hunyuan (${model}) image generation timeout after 60s`);
}

/**
 * 通过 gptimage2 代理 API 生成图片
 * 
 * 使用 gptimage2 代理（https://grsai.dakka.com.cn）的异步提交+轮询模式：
 * - 提交任务: POST /v1/draw/completions → 获取 taskId
 * - 轮询结果: POST /v1/draw/result → 每2秒一次，最多300次（10分钟）
 * - 支持图生图（urls 参数传参考图 base64）
 */
async function generateGptImage2(
  prompt: string,
  config: APIConfig,
  size: ImageSize,
  referenceImage?: string
): Promise<{ imageBase64: string; tokenUsage: number }> {
  const baseURL = config.endpoint || 'https://grsai.dakka.com.cn';
  const model = config.model || 'gpt-image-2';

  // 尺寸映射为 aspectRatio
  const aspectRatioMap: Record<string, string> = {
    '1024x1024': '1:1',
    '1024x1792': '9:16',
    '1792x1024': '16:9',
    '2560x1440': '16:9',
  };
  const aspectRatio = aspectRatioMap[size] || '1:1';

  console.log(`[GPT Image 2] Starting generation, model=${model}, aspectRatio=${aspectRatio}, hasRef=${!!referenceImage}`);

  // 构建提交请求体
  const submitBody: Record<string, any> = {
    model,
    prompt,
    aspectRatio,
    webHook: '-1',  // 禁用 webhook，使用轮询
  };

  // 如果有参考图，添加到 urls 字段
  if (referenceImage) {
    submitBody.urls = [`data:image/jpeg;base64,${referenceImage}`];
  }

  console.log('[GPT Image 2] Submitting task to:', `${baseURL}/v1/draw/completions`);

  // Step 1: 提交任务
  const submitRes = await fetch(`${baseURL}/v1/draw/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(submitBody),
  });

  if (!submitRes.ok) {
    const errorText = await submitRes.text();
    console.error('[GPT Image 2 Submit ERROR]', submitRes.status, errorText);
    throw new Error(`GPT Image 2 Submit Error: ${submitRes.status} - ${errorText}`);
  }

  const submitData = await submitRes.json();
  console.log('[GPT Image 2 Submit Response]', JSON.stringify(submitData, null, 2));

  // gptimage2 返回格式: { code: 0, data: { id } }
  if (submitData.code !== 0) {
    throw new Error(`GPT Image 2 Submit Error: code=${submitData.code}, message=${submitData.message || 'unknown'}`);
  }

  const taskId = submitData.data?.id;
  if (!taskId) {
    throw new Error('Failed to get task ID from GPT Image 2 submit response');
  }

  console.log('[GPT Image 2] Task submitted, ID:', taskId);

  // Step 2: 轮询结果（每2秒，最多300次 = 10分钟）
  const maxAttempts = 300;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000));

    try {
      const pollRes = await fetch(`${baseURL}/v1/draw/result`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: taskId }),
      });

      if (!pollRes.ok) continue;

      const pollData = await pollRes.json();
      
      // 格式: { code: 0, data: { id, progress, status: "succeeded"|"failed", results: [{url}] } }
      if (pollData.code !== 0) continue;

      const task = pollData.data;
      if (!task) continue;

      console.log(`[GPT Image 2 Poll] attempt=${i + 1}, status=${task.status}, progress=${task.progress}%`);

      if (task.status === 'succeeded') {
        const imageUrl = task.results?.[0]?.url;
        if (!imageUrl) {
          throw new Error('GPT Image 2 task succeeded but no image URL in response');
        }

        // 下载图片并转换为 base64
        console.log('[GPT Image 2] Downloading result image from:', imageUrl);
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.status}`);
        }
        const imageBuffer = await imageResponse.arrayBuffer();
        const imageBase64 = Buffer.from(imageBuffer).toString('base64');

        console.log('[GPT Image 2] Success, image size:', (imageBase64.length / 1024).toFixed(2), 'KB');
        return { imageBase64, tokenUsage: 1 };
      }

      if (task.status === 'failed') {
        const reason = task.failure_reason || task.error || 'unknown error';
        throw new Error(`GPT Image 2 generation failed: ${reason}`);
      }

      // progress < 100，继续轮询
    } catch (err: any) {
      // 如果是我们主动抛出的错误（如 failed），直接抛出
      if (err.message?.includes('GPT Image 2 generation failed') || err.message?.includes('Failed to download')) {
        throw err;
      }
      // 其他网络错误继续重试
      console.warn(`[GPT Image 2 Poll] Network error on attempt ${i + 1}:`, err.message);
    }
  }

  throw new Error('GPT Image 2 image generation timeout after 600s (300 attempts)');
}

function createOpenAIClient(config: APIConfig): OpenAI {
  const baseURL = config.useProxy && config.proxyEndpoint 
    ? config.proxyEndpoint 
    : config.endpoint || undefined;

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL,
    dangerouslyAllowBrowser: true,
  });
}
