/**
 * 各模型服务商支持的尺寸配置
 * 采用「比例 + 质量档位」双层模型：
 *   - 用户选择比例（1:1、3:4、4:3、9:16、16:9）
 *   - 后端根据服务商映射到具体像素
 * 保留"自定义尺寸"作为高级选项
 */

export interface SizeOption {
  label: string;
  value: string;       // 比例值，如 '1:1'；自定义时为像素字符串如 '1024x1024'
  ratio: string;       // 显示用比例
  description: string;
  isCustom?: boolean;
  /** 预览提示：建议该比例的分辨率（不参与数据传递） */
  resolutionHint?: string;
}

// 比例预设 — 前端只展示比例，不暴露具体像素
export const ALL_SIZE_OPTIONS: SizeOption[] = [
  { label: '1:1 正方形', value: '1:1', ratio: '1:1', description: '头像、社交媒体', resolutionHint: '1024×1024' },
  { label: '3:4 竖版', value: '3:4', ratio: '3:4', description: '竖版海报', resolutionHint: '768×1024' },
  { label: '4:3 横版', value: '4:3', ratio: '4:3', description: '横版海报', resolutionHint: '1024×768' },
  { label: '9:16 手机竖屏', value: '9:16', ratio: '9:16', description: '手机壁纸、故事分享', resolutionHint: '1024×1792' },
  { label: '16:9 宽屏', value: '16:9', ratio: '16:9', description: '宽屏展示', resolutionHint: '1792×1024' },
  { label: '⚙️ 自定义尺寸', value: 'custom', ratio: '自定义', description: '手动输入任意像素', isCustom: true },
];

// 各服务商支持的宽高比配置（按 value 匹配）
export const MODEL_SIZE_CONFIGS: Record<string, string[]> = {
  // 腾讯混元：
  // - 极速版（Lite）：4 种分辨率，乘积 ≤ 1024×1024
  // - 3.0 版：支持全比例，宽高均在 [512, 2048]，乘积 ≤ 1024×1024
  tencent: ['1:1', '3:4', '4:3', '9:16', '16:9'],

  // OpenAI/DALL-E：仅 3 种固定分辨率
  openai: ['1:1', '9:16', '16:9'],

  // GPT-Image：直接传比例
  gptimage2: ['1:1', '9:16', '16:9'],

  // 字节跳动豆包：支持自定义宽高
  bytedance: ['1:1', '3:4', '4:3', '9:16', '16:9'],

  // 阿里云通义万相：支持自定义宽高（Qwen API 不传 size 参数，由 prompt 控制）
  aliyun: ['1:1', '3:4', '4:3', '9:16', '16:9'],

  // 其他服务商使用通用比例
  google: ['1:1', '3:4', '4:3', '9:16', '16:9'],
  deepseek: ['1:1', '3:4', '4:3', '9:16', '16:9'],
  xfyun: ['1:1', '3:4', '4:3', '9:16', '16:9'],
  baidu: ['1:1', '3:4', '4:3', '9:16', '16:9'],
  custom: ['1:1', '3:4', '4:3', '9:16', '16:9'],
};

/**
 * 根据服务商获取支持的尺寸选项
 */
export function getSupportedSizes(provider: string): SizeOption[] {
  const supportedValues = MODEL_SIZE_CONFIGS[provider] || MODEL_SIZE_CONFIGS.custom;
  const options = ALL_SIZE_OPTIONS.filter(option => supportedValues.includes(option.value));
  // 确保自定义尺寸选项总是显示在列表最后
  const customOption = ALL_SIZE_OPTIONS.find(o => o.isCustom);
  if (customOption && !options.find(o => o.isCustom)) {
    options.push(customOption);
  }
  return options;
}

/**
 * 检查尺寸（比例或像素字符串）是否被服务商支持
 */
export function isSizeSupported(size: string, provider: string): boolean {
  // 自定义尺寸（像素格式）认为是支持的
  if (/^\d+x\d+$/.test(size)) return true;
  // 检查是否在支持的比例列表中
  const supported = MODEL_SIZE_CONFIGS[provider] || MODEL_SIZE_CONFIGS.custom;
  return supported.includes(size);
}

/**
 * 获取服务商支持的尺寸描述（用于错误提示）
 */
export function getSupportedSizesDescription(provider: string): string {
  const sizes = MODEL_SIZE_CONFIGS[provider] || MODEL_SIZE_CONFIGS.custom;
  return sizes.join('、');
}
