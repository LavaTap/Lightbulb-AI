"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const generate_js_1 = __importDefault(require("./routes/generate.js"));
const records_js_1 = __importDefault(require("./routes/records.js"));
const modelConfigs_js_1 = __importDefault(require("./routes/modelConfigs.js"));
const errorHandler_js_1 = require("./middleware/errorHandler.js");
function createApp() {
    const app = (0, express_1.default)();
    // Request logging middleware
    app.use((req, res, next) => {
        const start = Date.now();
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        res.on('finish', () => {
            const duration = Date.now() - start;
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        });
        next();
    });
    // Middleware
    app.use((0, cors_1.default)());
    app.use(express_1.default.json({ limit: '50mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
    // Health check
    app.get('/health', (req, res) => {
        console.log('[Health Check] OK');
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    // Routes
    app.use('/api', generate_js_1.default);
    app.use('/api/records', records_js_1.default);
    app.use('/api/model-configs', modelConfigs_js_1.default);
    // Error handler
    app.use(errorHandler_js_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map