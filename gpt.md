gptimage2 代理工具：文+图生图 实现分析
整体架构
这是一个纯前端单文件 HTML 应用（约 1293 行），无需任何后端，直接在浏览器中运行。本质是一个 gpt-image-2 API 的代理客户端，负责将用户的文本提示词 + 参考图片封装后发送到远程 API 完成图生图。

核心数据流
code
用户输入文本 + 上传参考图
        ↓
[图片处理] FileReader.readAsDataURL() → base64 字符串
        ↓
[构建请求体] { model: "gpt-image-2", prompt, aspectRatio, urls: [base64...] }
        ↓
[提交任务] POST {baseUrl}/v1/draw/completions → 返回 { data: { id: "task_id" } }
        ↓
[轮询结果] POST {baseUrl}/v1/draw/result 每2秒轮询一次，最多300次
        ↓
[解析响应] status === "succeeded" → data.results[0].url → 展示/下载
关键实现细节
1. 状态管理（localStorage 持久化）
index.htmlL554-L564
let state = {
    apiKey: '',
    baseUrl: 'https://grsai.dakka.com.cn',
    uploadedImages: [],
    history: [],
    isGenerating: false,
    abortController: null,
    pollInterval: null,
    currentTaskId: null,
    theme: 'light'
};
所有数据存储在浏览器 localStorage 中，包括 API Key、历史记录等，隐私数据不经过第三方服务器。

2. 图片上传 → base64 编码
index.htmlL722-L750
function handleImageUpload(event) {
    const files = Array.from(event.target.files);
    const maxSize = 5 * 1024 * 1024;  // 5MB 限制
    const maxCount = 5;                // 最多 5 张

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            state.uploadedImages.push({
                name: file.name,
                data: e.target.result  // base64 data URL
            });
        };
        reader.readAsDataURL(file);    // ← 关键：转为 base64
    });
}
图片通过 FileReader.readAsDataURL() 转为 base64 格式的 data URL（如 data:image/png;base64,iVBOR...），直接存入内存不经过任何中间服务器。

3. 文+图组合请求（核心）
index.htmlL796-L802
const requestBody = {
    model: 'gpt-image-2',
    prompt: prompt,                              // 文本提示词
    aspectRatio: aspectRatio,                     // 图片比例
    urls: state.uploadedImages.map(img => img.data),  // ← base64 图片数组
    webHook: '-1'
};
urls 字段是关键——它将用户上传的所有参考图片（base64 编码）与文本提示词一起发送给 API。模型 gpt-image-2 会结合图片内容和文字描述来生成新图。

4. 异步提交 + 轮询模式
index.htmlL823-L865
// Step 1: 提交任务
const response = await fetch(`${state.baseUrl}/v1/draw/completions`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.apiKey}`
    },
    body: JSON.stringify(requestBody),
    signal: state.abortController.signal
});

// 获取 taskId
const jsonData = await response.json();
record.taskId = jsonData.data.id;

// Step 2: 开始轮询
startPolling(record);
index.htmlL868-L932
function startPolling(record) {
    state.pollInterval = setInterval(async () => {
        const response = await fetch(`${state.baseUrl}/v1/draw/result`, {
            method: 'POST',
            body: JSON.stringify({ id: record.taskId })
        });
        const result = await response.json();
        
        // 更新进度条
        document.getElementById('progress-fill').style.width = `${data.progress}%`;
        
        if (data.status === 'succeeded') {
            record.imageUrl = data.results[0].url;  // 获取生成结果URL
            stopPolling();
            finalizeGeneration(record);
        }
    }, 2000);  // 每 2 秒轮询，最多 300 次（10 分钟超时）
}
采用异步任务模式：提交任务→获取 taskId→轮询结果。支持进度条显示和用户取消（通过 AbortController）。

API 端点总结
端点	方法	请求体	返回
/v1/draw/completions	POST	{ model, prompt, aspectRatio, urls, webHook }	{ code:0, data: { id } }
/v1/draw/result	POST	{ id }	{ code:0, data: { status, progress, results: [{ url }] } }
可借鉴的设计点
单文件纯前端：零依赖部署，只需浏览器即可运行
localStorage 全量持久化：API Key、历史记录、设置全部存储在本地
异步轮询模式：适配长时间生图任务，带进度反馈和取消功能
base64 直传：图片无需上传到中间服务器，直接编码后在请求体中发送
历史记录回填：支持从历史记录一键重新生成（regenerate 函数回填参数到表单）
数据导入导出：JSON 格式备份恢复，包含 API Key 和历史记录
这个工具与你们 Lightbulb AI 项目的主要区别在于：它是直接面向终端用户的代理工具，而 Lightbulb AI 是一个完整的前后端分离系统，支持多模型管理、三视图生成、视觉分析等更复杂的流程。但图片 base64 编码传输、异步轮询模式这些模式是完全可复用的。