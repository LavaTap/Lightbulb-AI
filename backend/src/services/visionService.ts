import OpenAI from 'openai';
import type { APIConfig, VisionAnalysisResult } from '../types/index.js';

const VISION_PROMPT = `请分析这张图片的视觉特征，重点分析画风特征。

**分析要求：**
1. 自由分析图片内容，不限定必须是角色或特定维度
2. 可以是角色、场景、物体、静物、风景等任何内容
3. **重点分析画风特征**：包括但不限于：
   - 绘画风格（赛璐璐、厚涂、水彩、扁平插画、写实、抽象等）
   - 线条质感（流畅、粗犷、细腻、模糊等）
   - 色彩倾向（色调、冷暖、饱和度、配色方案等）
   - 光影处理（光影风格、光源方向、阴影表现等）
   - 材质表现（质感、纹理、透明度等）
4. 如果是角色：可分析角色形象、服装、姿态、表情等
5. 如果是场景：可分析场景氛围、构图、环境元素、空间感等

**返回格式：**
请直接返回纯JSON格式，不要包含任何markdown代码块标记：

{"analysis":{"zh":"详细的中文分析结果","en":"Detailed analysis in English"}}

请只返回JSON，不要有任何其他文字或格式标记。`;

// Vision analysis always uses qwen-vl-plus on Alibaba Cloud DashScope
const VISION_MODEL = 'qwen-vl-plus';
const VISION_ENDPOINT = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

export async function analyzeImage(
  imageBase64: string,
  config: APIConfig
): Promise<{ result: VisionAnalysisResult; tokenUsage: number }> {
  // Use Alibaba Cloud DashScope for vision analysis
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: VISION_ENDPOINT,
    dangerouslyAllowBrowser: true,
  });

  console.log('\n========== Vision API Request (qwen-vl-plus) ==========');
  console.log('[Model]', VISION_MODEL);
  console.log('[Endpoint]', VISION_ENDPOINT);
  console.log('[Image Size]', (imageBase64.length / 1024).toFixed(2), 'KB');
  console.log('======================================================\n');

  const response = await client.chat.completions.create({
    model: VISION_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: VISION_PROMPT },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
              detail: 'high'
            }
          }
        ]
      }
    ],
    max_tokens: 2000,
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content || '{}';
  const tokenUsage = response.usage?.total_tokens || 0;
  
  console.log('\n========== Vision API Response ==========');
  console.log('[Token Used]', tokenUsage);
  console.log('[Content Preview]', content.substring(0, 200) + '...');
  console.log('========================================\n');

  let result: VisionAnalysisResult;
  try {
    // 去除 markdown 代码块标记
    let cleanContent = content
      .replace(/^```json\s*/i, '') // 去除开头的 ```json
      .replace(/^```\s*/i, '') // 去除开头的 ```
      .replace(/\s*```$/, '') // 去除结尾的 ```
      .trim();
    
    // 提取 JSON
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      result = JSON.parse(cleanContent);
    }
  } catch (e) {
    result = {
      analysis: { zh: content, en: content }
    };
  }

  return { result, tokenUsage };
}
