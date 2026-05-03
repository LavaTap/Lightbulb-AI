"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const app_js_1 = require("./app.js");
const database_js_1 = require("./database.js");
const chromaService_js_1 = require("./services/chromaService.js");
dotenv_1.default.config();
const PORT = parseInt(process.env.PORT || '3001');
async function start() {
    const app = (0, app_js_1.createApp)();
    // Initialize database on startup
    await (0, database_js_1.getDatabase)();
    // Initialize ChromaDB (optional - graceful degradation)
    try {
        await (0, chromaService_js_1.initChroma)();
    }
    catch (e) {
        console.warn('ChromaDB not available, chat memory features disabled');
    }
    const server = app.listen(PORT, () => {
        console.log(`Lightbulb AI Backend running on http://localhost:${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/health`);
    });
    // Graceful shutdown
    const shutdown = () => {
        console.log('Shutting down gracefully');
        server.close(() => {
            (0, database_js_1.closeDatabase)();
            console.log('Server closed');
            process.exit(0);
        });
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}
start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map