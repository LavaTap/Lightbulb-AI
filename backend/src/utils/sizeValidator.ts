/**
 * 各模型服务商尺寸校验工具
 * 采用「比例」模式：前端传比例（如 '1:1'、'9:16'），后端映射为具体像素
 *
 * 同时兼容旧版像素格式（如 '1024x1024'）用于自定义尺寸
 */

export type ImageSize = string;

// ====== 宽高比 → 像素映射 ======

/** 默认比例→像素映射（各家通用的分辨率） */
export const RATIO_TO_PIXELS: Record<string, string> = {
  '1:1': '1024x1024',
  '3:4': '768x1024',
  '4:3': '1024x768',
  '9:16': '1024x1792',
  '16:9': '1792x1024',
};

/** 各服务商的比例→像素映射（可覆盖默认值） */
export const PROVIDER_RATIO_PIXELS: Record<string, Record<string, string>> = {
  // OpenAI/DALL-E：仅 3 种固定分辨率
  openai: {
    '1:1': '1024x1024',
    '9:16': '1024x1792',
    '16:9': '1792x1024',
  },
  // GPT-Image：直接传比例，不需映射；此处仅作兼容
  gptimage2: {
    '1:1': '1024x1024',
    '9:16': '1024x1792',
    '16:9': '1792x1024',
  },
  // 腾讯混元：
  // - 极速版（Lite）：乘积 ≤ 1024×1024
  // - 3.0 版：宽高均在 [512, 2048]，乘积 ≤ 1024×1024
  tencent: {
    '1:1': '1024x1024',
    '3:4': '768x1024',
    '4:3': '1024x768',
    '9:16': '768x1365',
    '16:9': '1365x768',
  },
};

/** 各服务商支持的宽高比列表 */
export const SUPPORTED_RATIOS: Record<string, string[]> = {
  tencent: ['1:1', '3:4', '4:3', '9:16', '16:9'],
  openai: ['1:1', '9:16', '16:9'],
  gptimage2: ['1:1', '9:16', '16:9'],
  bytedance: ['1:1', '3:4', '4:3', '9:16', '16:9'],
  aliyun: ['1:1', '3:4', '4:3', '9:16', '16:9'],
  google: ['1:1', '3:4', '4:3', '9:16', '16:9'],
  deepseek: ['1:1', '3:4', '4:3', '9:16', '16:9'],
  xfyun: ['1:1', '3:4', '4:3', '9:16', '16:9'],
  baidu: ['1:1', '3:4', '4:3', '9:16', '16:9'],
  custom: ['1:1', '3:4', '4:3', '9:16', '16:9'],
};

// 服务商中文名称映射
export const PROVIDER_NAMES: Record<string, string> = {
  tencent: '腾讯混元',
  openai: 'OpenAI/DALL-E',
  gptimage2: 'GPT-Image',
  bytedance: '字节跳动豆包',
  aliyun: '阿里云通义万相',
  google: 'Google',
  deepseek: 'DeepSeek',
  xfyun: '讯飞星火',
  baidu: '百度文心',
  custom: '自定义',
};

/**
 * 将比例解析为像素尺寸
 * @param size 比例字符串（如 '1:1'）或像素字符串（如 '1024x1024'）
 * @param provider 服务商 ID
 * @returns 像素尺寸字符串（如 '1024x1024'）
 */
export function resolvePixelSize(size: string, provider: string): string {
  // 已经是像素格式，直接返回
  if (/^\d+x\d+$/.test(size)) return size;
  // 比例格式，查映射表
  const providerMap = PROVIDER_RATIO_PIXELS[provider];
  if (providerMap && providerMap[size]) return providerMap[size];
  // 回退到默认映射
  return RATIO_TO_PIXELS[size] || RATIO_TO_PIXELS['1:1'];
}

/**
 * 判断字符串是否为比例格式
 */
export function isRatioFormat(size: string): boolean {
  return /^\d+:\d+$/.test(size);
}

/**
 * 判断字符串是否为像素格式
 */
export function isPixelFormat(size: string): boolean {
  return /^\d+x\d+$/.test(size);
}

/**
 * 解析像素尺寸字符串
 */
export function parseSize(size: string): { width: number; height: number } {
  if (isRatioFormat(size)) {
    // 如果是比例，先查映射再解析
    const pixelSize = RATIO_TO_PIXELS[size] || '1024x1024';
    return parsePixelSize(pixelSize);
  }
  return parsePixelSize(size);
}

function parsePixelSize(size: string): { width: number; height: number } {
  const [widthStr, heightStr] = size.split('x');
  return {
    width: parseInt(widthStr, 10),
    height: parseInt(heightStr, 10),
  };
}

/**
 * 计算宽高比数值
 */
export function getAspectRatio(size: string): number {
  const { width, height } = parseSize(size);
  return width / height;
}

/**
 * 计算总像素数
 */
export function getTotalPixels(size: string): number {
  const { width, height } = parseSize(size);
  return width * height;
}

/**
 * 尺寸校验结果
 */
export interface SizeValidationResult {
  valid: boolean;
  message?: string;
  supportedSizes?: string[];
}

/**
 * 校验尺寸（比例或像素）是否被服务商支持
 */
export function validateSize(size: string, provider: string): SizeValidationResult {
  // 校验格式：比例格式 a:b 或像素格式 axb
  if (!/^(\d+:\d+|\d+x\d+)$/.test(size)) {
    return {
      valid: false,
      message: `尺寸格式错误，请使用比例格式 (如 1:1) 或像素格式 (如 1024x1024)`,
    };
  }

  // 自定义像素格式总是允许（调试用）
  if (isPixelFormat(size)) {
    return { valid: true };
  }

  const supportedRatios = SUPPORTED_RATIOS[provider] || SUPPORTED_RATIOS.custom;

  // 检查比例是否在支持列表中
  if (!supportedRatios.includes(size)) {
    const providerName = PROVIDER_NAMES[provider] || provider;
    console.warn(`[Size Warning] ${providerName} 可能不支持比例 ${size}，已开启调试模式允许尝试`);
    return { valid: true };
  }

  return { valid: true };
}

/**
 * 获取服务商支持的尺寸列表
 */
export function getSupportedSizes(provider: string): string[] {
  return SUPPORTED_RATIOS[provider] || SUPPORTED_RATIOS.custom;
}

/**
 * 获取服务商支持的尺寸描述（用于错误提示）
 */
export function getSupportedSizesDescription(provider: string): string {
  return getSupportedSizes(provider).join('、');
}
