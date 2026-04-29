"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeImage = analyzeImage;
const openai_1 = __importDefault(require("openai"));
// 根据分析类别生成差异化的 prompt
function getVisionPrompt(category) {
    const basePrompt = (() => {
        switch (category) {
            case 'character':
                return `请详细分析这张图片中的角色视觉特征。

**重点分析内容：**
1. **角色形象**：外貌特征、服装设计、发型发色、配饰细节
2. **姿态动作**：站姿/坐姿/动态姿势、身体朝向、手部动作
3. **表情神态**：面部表情、眼神状态、情绪氛围
4. **画风特征**：绘画风格、线条质感、色彩倾向、光影处理
5.**比例分析**：请重点分析角色的人体比例体系：
- 头身比例（头与全身的比例关系，如 Q 版 2-3 头身、写实 7-8 头身等）
- 三庭五眼（面部纵向比例）
- 肩宽与腰宽比例
- 上下身比例（腰线位置）
- 四肢长度与粗细比例
- 手脚大小比例关系

**返回格式：**
请直接返回纯JSON格式，不要包含任何markdown代码块标记：

{"analysis":{"zh":"详细的中文分析结果，包含比例分析","en":"Detailed analysis in English including proportions"},"category":"character"}

请只返回JSON，不要有任何其他文字或格式标记。`;
            case 'landscape':
                return `请分析这张图片中的场景/风景视觉特征。

**重点分析内容：**
1. **场景氛围**：时间（白天/黄昏/夜晚/黎明）、天气（晴/雨/雪/雾）、季节、情绪基调
2. **空间构图**：画面层次（前景/中景/背景）、透视关系（一点/两点/三点透视）、构图法则（三分法/对角线等）
3. **环境元素**：建筑、植物、地形、水体等主要元素特征
4. **空间层次**：远近关系、虚实对比、空间深度感
5. **画风特征**：绘画风格、色彩色调、光影氛围、纹理质感

**返回格式：**
请直接返回纯JSON格式，不要包含任何markdown代码块标记：

{"analysis":{"zh":"详细的中文分析结果","en":"Detailed analysis in English"},"category":"landscape"}

请只返回JSON，不要有任何其他文字或格式标记。`;
            case 'object':
                return `请分析这张图片中的物品/物体视觉特征。

**重点分析内容：**
1. **造型结构**：外形轮廓、几何形态、比例关系、结构层次
2. **材质细节**：表面材质（金属/木质/布料/塑料/玻璃等）、纹理特征、质感表现
3. **光影反射**：光源方向、高光/反光/阴影表现、材质光感
4. **色彩配色**：主体色、辅助色、点缀色、配色方案
5. **设计细节**：装饰元素、图案纹样、造型风格（简约/繁复/复古/现代等）

**返回格式：**
请直接返回纯JSON格式，不要包含任何markdown代码块标记：

{"analysis":{"zh":"详细的中文分析结果","en":"Detailed analysis in English"},"category":"object"}

请只返回JSON，不要有任何其他文字或格式标记。`;
            default:
                return `请分析这张图片的视觉特征，重点分析画风特征。

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

{"analysis":{"zh":"详细的中文分析结果","en":"Detailed analysis in English"},"category":"other"}

请只返回JSON，不要有任何其他文字或格式标记。`;
        }
    })();
    return basePrompt;
}
// Vision analysis always uses qwen-vl-plus on Alibaba Cloud DashScope
const VISION_MODEL = 'qwen-vl-plus';
const VISION_ENDPOINT = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
async function analyzeImage(imageBase64, config, category) {
    // 根据 category 生成对应的 prompt
    const prompt = getVisionPrompt(category);
    // Use Alibaba Cloud DashScope for vision analysis
    const client = new openai_1.default({
        apiKey: config.apiKey,
        baseURL: VISION_ENDPOINT,
        dangerouslyAllowBrowser: true,
    });
    console.log('\n========== Vision API Request (qwen-vl-plus) ==========');
    console.log('[Model]', VISION_MODEL);
    console.log('[Endpoint]', VISION_ENDPOINT);
    console.log('[Image Size]', (imageBase64.length / 1024).toFixed(2), 'KB');
    console.log('[API Key Prefix]', config.apiKey?.substring(0, 8) + '...');
    console.log('[Max Tokens]', 2000);
    console.log('[Temperature]', 0.3);
    console.log('[Detail]', 'high');
    console.log('[Request Time]', new Date().toISOString());
    console.log('======================================================\n');
    const requestStartTime = Date.now();
    const response = await client.chat.completions.create({
        model: VISION_MODEL,
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
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
    const requestDuration = Date.now() - requestStartTime;
    const content = response.choices[0]?.message?.content || '{}';
    const tokenUsage = response.usage?.total_tokens || 0;
    const responseId = response.id;
    const modelUsed = response.model;
    const finishReason = response.choices[0]?.finish_reason;
    console.log('\n========== Vision API Response ==========');
    console.log('[Response ID]', responseId);
    console.log('[Model Used]', modelUsed);
    console.log('[Finish Reason]', finishReason);
    console.log('[Token Used]', tokenUsage);
    console.log('[Request Duration]', requestDuration + 'ms');
    console.log('[Content Length]', content.length, 'chars');
    console.log('[Content Preview]', content.substring(0, 300) + (content.length > 300 ? '...' : ''));
    console.log('========================================\n');
    let result;
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
        }
        else {
            result = JSON.parse(cleanContent);
        }
    }
    catch (e) {
        result = {
            analysis: { zh: content, en: content }
        };
    }
    return { result, tokenUsage };
}
//# sourceMappingURL=visionService.js.map