"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validateRequest_js_1 = require("../middleware/validateRequest.js");
const visionService_js_1 = require("../services/visionService.js");
const imageGenService_js_1 = require("../services/imageGenService.js");
const posterService_js_1 = require("../services/posterService.js");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// Vision analyze endpoint
router.post('/vision/analyze', async (req, res, next) => {
    try {
        const { imageBase64, config, category } = validateRequest_js_1.analyzeSchema.parse(req.body);
        console.log('[Vision Analyze] Starting...');
        console.log('[Config]', JSON.stringify({
            provider: config.provider,
            model: config.model,
            endpoint: config.endpoint,
            hasApiKey: !!config.apiKey,
            useProxy: config.useProxy,
            proxyEndpoint: config.proxyEndpoint,
            category: category || 'other (default)'
        }));
        const { result, tokenUsage } = await (0, visionService_js_1.analyzeImage)(imageBase64, config, category);
        res.json({
            success: true,
            data: result,
            tokenUsage
        });
    }
    catch (error) {
        console.error('[Vision Analyze ERROR]', error.message);
        console.error('[Stack]', error.stack);
        if (error.code === 'ECONNREFUSED') {
            res.status(502).json({ success: false, error: '无法连接到 API 服务，请检查代理设置' });
        }
        else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
            res.status(504).json({ success: false, error: 'API 请求超时，请检查网络连接' });
        }
        else if (error.status === 401 || error.message?.includes('401')) {
            res.status(401).json({ success: false, error: 'API Key 无效或已过期' });
        }
        else if (error.status === 429) {
            res.status(429).json({ success: false, error: 'API 请求过于频繁，请稍后重试' });
        }
        else if (error instanceof zod_1.ZodError) {
            res.status(400).json({ success: false, error: error.errors });
        }
        else {
            next(error);
        }
    }
});
// Image generate endpoint
router.post('/image/generate', async (req, res, next) => {
    try {
        const { prompt, config, size, referenceImage } = validateRequest_js_1.generateImageSchema.parse(req.body);
        console.log('[Image Generate] Starting...');
        console.log('[Config]', JSON.stringify({
            provider: config.provider,
            model: config.model,
            endpoint: config.endpoint,
            hasApiKey: !!config.apiKey,
            useProxy: config.useProxy
        }));
        console.log('[Has Reference Image]', !!referenceImage, referenceImage ? `(${(referenceImage.length / 1024).toFixed(2)} KB)` : '');
        const { imageBase64, tokenUsage } = await (0, imageGenService_js_1.generateImage)(prompt, config, size, referenceImage);
        res.json({
            success: true,
            data: { imageBase64 },
            tokenUsage
        });
    }
    catch (error) {
        console.error('[Image Generate ERROR]', error.message);
        if (error.code === 'ECONNREFUSED') {
            res.status(502).json({ success: false, error: '无法连接到 API 服务，请检查代理设置' });
        }
        else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
            res.status(504).json({ success: false, error: 'API 请求超时' });
        }
        else if (error.status === 401) {
            res.status(401).json({ success: false, error: 'API Key 无效' });
        }
        else if (error instanceof zod_1.ZodError) {
            res.status(400).json({ success: false, error: error.errors });
        }
        else {
            next(error);
        }
    }
});
// Poster generate endpoint
router.post('/poster/generate', async (req, res, next) => {
    try {
        const { images, prompt, config } = validateRequest_js_1.generatePosterSchema.parse(req.body);
        console.log('[Poster Generate] Starting...');
        const { imageBase64, tokenUsage } = await (0, posterService_js_1.generatePoster)(images, prompt, config);
        res.json({
            success: true,
            data: { imageBase64 },
            tokenUsage
        });
    }
    catch (error) {
        console.error('[Poster Generate ERROR]', error.message);
        if (error.code === 'ECONNREFUSED') {
            res.status(502).json({ success: false, error: '无法连接到 API 服务，请检查代理设置' });
        }
        else if (error instanceof zod_1.ZodError) {
            res.status(400).json({ success: false, error: error.errors });
        }
        else {
            next(error);
        }
    }
});
exports.default = router;
//# sourceMappingURL=generate.js.map