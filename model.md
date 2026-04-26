各模态大模型 API 接入方式与核心要求汇总
本文基于各模型官方文档，按文生图、双向多模态、图生文三大类别，梳理 API 接入的核心流程、鉴权方式、接口规范与硬性要求，所有信息均来自厂商官方开放平台最新文档。
一、文生图（Text-to-Image）模型
1. Wan2.7-Image / Wan2.7-Image-Pro（阿里云通义万相）
接入前提
注册阿里云账号并完成实名认证，开通「百炼大模型服务平台」服务
生成对应地域的 API Key（北京、新加坡地域 API Key 与请求地址独立，不可混用）
安装依赖：Python SDK 要求dashscope>=1.25.15，或直接使用 HTTP 接口调用
核心接入方式
表格
调用模式	适用场景	接口地址
HTTP 同步调用	简单文生图、低耗时任务，一次请求获取结果	北京：https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation
新加坡：https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation
HTTP 异步调用	复杂生成、高清图、多图参考任务，需先提交任务再轮询结果	提交任务：https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation
结果查询：https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}
Python SDK 调用	工程化集成，底层封装异步流程，支持同步 / 异步写法	基于dashscope.ImageGeneration封装，参数与 HTTP 接口完全对齐
鉴权方式
请求头固定格式：Authorization: Bearer {DASHSCOPE_API_KEY}
异步调用需额外添加请求头：X-DashScope-Async: enable
核心请求规范
必选参数：model（固定值wan2.7-image/wan2.7-image-pro）、input.messages（固定role:user，content包含text提示词，可选image参考图）
提示词限制：长度不超过 5000 字符，中英文通用，超量自动截断
参考图限制：支持 0-9 张图，格式 JPG/PNG/BMP/WEBP，单张≤20MB，分辨率宽高 [240,8000] px，宽高比 [1:8,8:1]
分辨率支持：Pro 版文生图最高 4K，编辑 / 组图场景最高 2K；标准版最高 2K
关键限制
生成的图片 URL 有效期 24 小时，需及时下载保存
按生成图片张数计费，不计 token 消耗
异步任务 ID 有效期 24 小时，超时无法查询结果
2. 混元生图（基础版 / 对话版）（腾讯混元）
接入前提
注册腾讯云账号并完成实名认证，开通「混元生图」服务
生成 API 密钥对（SecretId + SecretKey），子账号需授予QcloudAIARTFullAccess权限
支持两种接入体系：腾讯云原生 API 3.0（TC3 签名）、OpenAI 兼容接口
核心接入方式
表格
模型版本	接口类型	核心接口	调用流程
混元生图基础版	同步接口	图像风格化（图生图）等	单次请求直接返回生成结果
混元生图基础版	异步接口	SubmitHunyuanImageJob（提交任务）、QueryHunyuanImageJob（查询结果）	提交任务获取 JobId → 轮询查询任务状态 → 生成完成获取图片 URL
混元生图对话版（多轮）	异步接口	SubmitHunyuanImageChatJob、QueryHunyuanImageChatJob	支持传入前置对话 ID，实现多轮图像调整，流程同异步接口
统一 API 端点：hunyuan.tencentcloudapi.com
OpenAI 兼容接口地址：https://api.lkeap.cloud.tencent.com/v1，可直接用 OpenAI SDK 替换 base_url 与 API Key 调用
鉴权方式
原生 API 3.0：使用 TC3-HMAC-SHA256 签名算法，请求头需包含签名信息、SecretId、时间戳等公共参数
OpenAI 兼容接口：请求头Authorization: Bearer {LKEAP_API_KEY}
核心请求规范
基础版支持单轮文生图、图生图；对话版支持多轮对话式图像调整，可继承上一轮生成的图像特征
提示词支持中文精准语义理解，覆盖人物、风景、建筑、LOGO 等多场景生成
免训练模式仅需 1 张参考图即可生成，常规训练模式需 20-25 张训练图
关键限制
基础版默认提供 1 个并发任务数，对话版默认 1 个并发，超并发需在控制台增购
首次开通赠送 100 万通用 Token，免费额度耗尽后需开通后付费模式
任务状态流转：INIT/WAIT/RUN → DONE/FAIL，仅 DONE 状态可获取结果图片
3. Nano Banana / Nano Banana Pro / Nano Banana 2（Google Gemini）
接入前提
注册 Google 账号，登录 Google AI Studio（aistudio.google.com）生成 API Key
为 Google Cloud 项目开启计费，API 调用按量计费；原型测试可使用 AI Studio 免费额度
安装依赖：Python SDK pip install google-genai，或直接调用 Gemini HTTP 接口
核心接入方式
官方模型映射：
Nano Banana：gemini-2.5-flash-image-preview
Nano Banana Pro：gemini-2.5-pro-image-preview
Nano Banana 2：gemini-3.1-flash-image-preview
核心调用：通过models.generate_content接口，支持文生图、图生图 / 图像编辑，单轮请求即可返回生成结果
接口地址：https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent
鉴权方式
HTTP 请求头：x-goog-api-key: {GEMINI_API_KEY}
SDK 初始化：genai.Client(api_key="你的_API_KEY")，直接传入 API Key 完成鉴权
核心请求规范
必选参数：model（对应上述模型 ID）、contents（文本提示词，可选参考图二进制数据）
分辨率支持：Nano Banana 2 最高支持 4K 原生输出，新增 512px~4K 多档分辨率，宽高比支持 4:1、1:4、8:1 等超宽画幅
参考图支持：可传入本地图片二进制 / Base64，实现图生图、风格迁移、局部编辑
中文支持：Nano Banana 2 大幅优化中文文字渲染，基本解决乱码问题，复杂提示词理解能力显著提升
关键限制
计费规则：Nano Banana 2 $0.0672/张，Pro版 $0.134 / 张，按生成张数计费
主体一致性：Nano Banana 2 支持最多 5 个角色特征一致性保持，单张画面最高支持 14 个对象高保真呈现
网络要求：官方接口需海外网络环境访问，国内可使用合规第三方聚合平台中转
二、双向 / 多模态（Text↔Image）模型
1. Qwen3.6-Plus（阿里云通义千问）
接入前提
注册阿里云账号，开通百炼大模型服务，生成 DashScope API Key
支持两种接入模式：原生 DashScope 接口、OpenAI 兼容接口，推荐使用兼容接口快速迁移现有工程
安装依赖：pip install openai（兼容模式）或pip install dashscope（原生模式）
核心接入方式
兼容模式接口地址：
北京：https://dashscope.aliyuncs.com/compatible-mode/v1
新加坡：https://dashscope-intl.aliyuncs.com/compatible-mode/v1
美国弗吉尼亚：https://dashscope-us.aliyuncs.com/compatible-mode/v1
调用方式：完全兼容 OpenAI Chat Completions 接口，支持图文混合输入、流式输出、多轮对话
同时兼容 Anthropic 协议，可直接对接 Claude Code 等工具，替换 base_url 与 API Key 即可
鉴权方式
兼容模式：请求头Authorization: Bearer {DASHSCOPE_API_KEY}
原生模式：DashScope SDK 全局配置api_key，或请求头携带 Bearer Token
核心请求规范
模型固定标识：qwen3.6-plus
多模态输入：messages.content支持text+image（URL/Base64）混合数组，支持多图输入
上下文窗口：最高支持 100 万 token 超长上下文，支持长文档 + 多图混合理解
特色参数：enable_thinking（开启深度思维链）、preserve_thinking（保留多轮对话完整推理链，适配 Agent 场景）
关键限制
支持视频、文档等多模态输入，原生适配 Agent、工具调用、代码生成场景
免费额度：新用户开通可领取专属免费 Token 额度，按量计费模式按输入输出 token 阶梯收费
支持流式响应，适配实时对话场景，首 token 延迟显著优化
2. GPT-4o / GPT-4o-mini（OpenAI）
接入前提
注册 OpenAI 平台账号，完成手机号验证，创建 API Key
关键限制：免费账号（Free Tier）仅可调用 GPT-4o-mini，无法调用 GPT-4o；需绑定支付方式升级为付费账号，才可解锁全模型调用权限
安装依赖：pip install openai（官方推荐 SDK），或直接调用 HTTP 接口
核心接入方式
统一接口地址：https://api.openai.com/v1/chat/completions
调用模式：Chat Completions 接口，支持单轮 / 多轮对话、图文混合输入、流式输出、函数调用
模型标识：gpt-4o（旗舰多模态）、gpt-4o-mini（轻量高性价比多模态）
鉴权方式
请求头固定格式：Authorization: Bearer {OPENAI_API_KEY}
组织级调用需额外添加请求头：OpenAI-Organization: {组织ID}
核心请求规范
多模态输入：messages.content支持type:text+type:image_url组合，图片支持 URL/Base64，单轮对话支持多张图片输入
上下文窗口：GPT-4o 最高支持 128K token，GPT-4o-mini 最高支持 128K token
能力覆盖：文本理解与生成、图像理解、视觉推理、OCR、表格解析、代码生成、多轮工具调用
关键限制
计费规则：GPT-4o 输入$5/百万token，输出$15 / 百万 token；GPT-4o-mini 成本约为 GPT-4o 的 1/10
速率限制：免费账号 3rpm/150ktpm；付费账号默认 10krpm / 百万级 tpm，可提交工单申请提升
网络要求：官方接口需海外网络环境访问，国内需使用合规的云厂商国际节点接入
图片分辨率：最高支持 2048×2048 分辨率输入，按图片 tile 数折算 token 消耗
3. 豆包 Seed-2.0-Pro / Seed-2.0-Lite（字节跳动）
接入前提
注册火山引擎账号，完成实名认证，开通方舟大模型服务
生成 API Key，子账号需配置对应模型调用权限
接口完全兼容 OpenAI 规范，现有 OpenAI 工程仅需替换 base_url 与 API Key 即可无缝迁移
核心接入方式
官方接口地址：火山引擎方舟平台https://ark.cn-beijing.volces.com/api/v3
模型标识：doubao-seed-2-0-pro-260215、doubao-seed-2-0-lite-260215（以控制台最新版本为准）
调用方式：Chat Completions 接口，支持多模态图文输入、多轮对话、流式输出、工具调用
鉴权方式
请求头：Authorization: Bearer {VOLC_ARK_API_KEY}
支持全局 API Key 与应用级 API Key 两种鉴权模式，企业级场景推荐应用级隔离
核心请求规范
Pro 版：旗舰级多模态能力，支持小时级视频理解、视觉数学推理、复杂 Agent 工作流，对标 GPT-4o
Lite 版：通用生产场景优化，平衡性能与成本，适合高并发日常对话、文档处理、轻量图文理解场景
上下文窗口：Pro 版最高支持 128K token，Lite 版最高支持 128K token
关键限制
定价优势：Pro 版输入$0.47/百万token，输出$2.37 / 百万 token；Lite 版输入$0.09/百万token，输出$0.53 / 百万 token，成本远低于国际主流模型
国内合规：全链路国内部署，符合数据合规要求，无需海外网络
并发限制：默认并发数根据账号等级配置，可提交工单申请扩容
优化方向：中文语义理解、国内场景适配、低延迟响应，中文任务表现优于国际模型
4. 混元 Hy3-preview（腾讯混元）
接入前提
注册腾讯云账号，完成实名认证，开通混元大模型服务
支持原生 API 3.0 与 OpenAI 兼容接口两种接入方式
生成 SecretId+SecretKey 密钥对，或 LKEAP 平台 API Key
核心接入方式
原生 API 端点：hunyuan.tencentcloudapi.com，使用混元对话接口调用
OpenAI 兼容接口：https://api.lkeap.cloud.tencent.com/v1，模型标识以控制台最新预览版名称为准
能力覆盖：文本理解、图文混合输入、多轮对话、视觉推理、工具调用，是腾讯混元旗舰多模态预览模型
鉴权方式
原生 API：TC3-HMAC-SHA256 签名鉴权，需在请求头携带签名、时间戳、地域等公共参数
兼容接口：Authorization: Bearer {LKEAP_API_KEY}
核心请求规范
多模态输入：支持图片 URL/Base64 与文本混合输入，单轮对话支持多张图片
图片 token 计算：图片消耗token = h/32*(w/32+1) + 2（h/w 为 resize 到 32 整除的分辨率）
上下文窗口：最高支持 128K token，支持长文档 + 多图混合理解
关键限制
预览版模型默认提供 5 路并发，高并发需购买增购包
首次开通赠送 100 万免费 Token，Lite 版永久免费调用
合规要求：输入输出内容需符合国内内容安全规范，违规内容会被拦截并返回错误码
三、图生文（Image-to-Text）模型
1. 混元 Vision-1.5-Instruct / 混元 T1-Vision（腾讯混元）
接入前提
注册腾讯云账号，完成实名认证，开通混元大模型服务
生成 SecretId+SecretKey，或 LKEAP 平台 API Key
支持原生 API 与 OpenAI 兼容接口，适配图像理解、OCR、视觉推理、图文解析场景
核心接入方式
原生接口：混元对话接口，模型标识hunyuan-vision-1.5-instruct、hunyuan-t1-vision，请求体传入图文混合内容
兼容接口：https://api.lkeap.cloud.tencent.com/v1/chat/completions，使用 OpenAI SDK 直接调用
核心能力：通用图像理解、OCR 图文提取、表格解析、视觉问答、场景推理、多图对比理解
鉴权方式
原生 API：TC3-HMAC-SHA256 签名鉴权
兼容接口：Authorization: Bearer {LKEAP_API_KEY}
核心请求规范
图片输入：支持公网 URL、Base64 编码，格式 JPG/PNG/WEBP，单张图片≤20MB
分辨率支持：最高支持 8K 分辨率输入，自动缩放适配模型处理
指令优化：Instruct 版本针对中文指令跟随优化，支持精细化视觉问答、分步推理、多轮图文对话
关键限制
按输入输出 token 计费，图片按分辨率折算 token 计入输入总量
默认并发 5 路，可申请扩容；免费额度与混元通用模型共享
合规要求：需通过内容安全审核，违规图片与指令会被拦截
2. GPT-4（OpenAI）
接入前提
OpenAI 付费账号，创建 API Key，仅付费账号可调用 GPT-4 系列模型
支持 GPT-4 Turbo、GPT-4 Vision Preview 等版本，均支持图生文能力
安装openai SDK，或直接调用 HTTP 接口
核心接入方式
接口地址：https://api.openai.com/v1/chat/completions
模型标识：gpt-4-turbo（推荐，最新版支持视觉能力）、gpt-4-vision-preview
调用方式：Chat Completions 接口，messages中传入text指令 +image_url图片，支持单张 / 多张图片输入、多轮视觉对话
鉴权方式
请求头：Authorization: Bearer {OPENAI_API_KEY}
核心请求规范
图片输入：支持 URL/Base64，格式 JPG/PNG/WEBP/GIF，最高支持 2048×2048 分辨率
核心能力：高精度 OCR、复杂图表解析、视觉推理、场景理解、多图对比、数学公式识别、代码截图提取
细节控制：通过detail参数控制图片处理精度，low低分辨率快速处理，high高分辨率精细分析，对应不同 token 消耗
关键限制
计费规则：按输入输出 token 计费，图片按分辨率与 detail 等级折算 token，高分辨率精细分析 token 消耗更高
速率限制：与 GPT-4o 共享账号速率配额，付费账号可申请提升
网络要求：官方接口需海外网络环境访问
上下文窗口：GPT-4 Turbo 最高支持 128K token，可同时处理长文本 + 多张图片
通用接入核心注意事项
鉴权安全：所有 API Key 严禁硬编码到代码、上传到公开代码仓库，建议使用环境变量 / 密钥管理服务存储；子账号遵循最小权限原则配置。
合规要求：国内模型（阿里云、腾讯云、字节火山引擎）均需遵守《生成式人工智能服务管理暂行办法》，输入输出内容需通过内容安全审核，严禁生成违规内容。
成本控制：建议在控制台设置用量上限与告警，高并发场景优先选择性价比版本，避免超额扣费；图片类模型按张数计费，需做好生成次数管控。
异常处理：所有接口调用需添加重试机制、超时控制、错误码处理，针对限流、鉴权失败、内容审核拦截等场景做好兜底逻辑。
数据时效：生成的图片 URL、任务 ID 均有有效期（通常 24 小时），需及时下载保存关键数据，避免超时丢失。