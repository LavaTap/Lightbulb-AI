"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_js_1 = require("../database.js");
const validateRequest_js_1 = require("../middleware/validateRequest.js");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// Get all records with pagination (returns thumbnails for list display)
router.get('/', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const offset = (page - 1) * pageSize;
        const db = await (0, database_js_1.getDatabaseSync)();
        const totalResult = db.exec('SELECT COUNT(*) as count FROM generation_records');
        const total = totalResult[0]?.values[0]?.[0] || 0;
        const recordsResult = db.exec(`
      SELECT * FROM generation_records 
      ORDER BY created_at DESC 
      LIMIT ${pageSize} OFFSET ${offset}
    `);
        const columns = recordsResult[0]?.columns || [];
        const records = (recordsResult[0]?.values || []).map((row) => {
            const obj = {};
            columns.forEach((col, idx) => {
                obj[col] = row[idx];
            });
            return obj;
        });
        const formattedRecords = records.map((r) => ({
            id: r.id,
            featureType: r.feature_type,
            prompt: r.prompt,
            uploadImages: r.upload_images, // Use thumbnails for list display
            generatedImages: r.generated_images, // Use thumbnails for list display
            modelProvider: r.model_provider,
            modelName: r.model_name,
            tokenUsage: r.token_usage,
            createdAt: r.created_at
        }));
        res.json({
            success: true,
            data: {
                records: formattedRecords,
                total: total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize)
            }
        });
    }
    catch (error) {
        next(error);
    }
});
// Get record detail with original images
router.get('/:id/detail', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ success: false, error: 'Invalid record ID' });
            return;
        }
        const db = await (0, database_js_1.getDatabaseSync)();
        const recordResult = db.exec('SELECT * FROM generation_records WHERE id = ?', [id]);
        if (recordResult.length === 0 || recordResult[0].values.length === 0) {
            res.status(404).json({ success: false, error: 'Record not found' });
            return;
        }
        const columns = recordResult[0].columns;
        const row = recordResult[0].values[0];
        const record = {};
        columns.forEach((col, idx) => {
            record[col] = row[idx];
        });
        // Use original images if available, fallback to thumbnails
        const formattedRecord = {
            id: record.id,
            featureType: record.feature_type,
            prompt: record.prompt,
            uploadImages: record.upload_images_original || record.upload_images,
            generatedImages: record.generated_images_original || record.generated_images,
            modelProvider: record.model_provider,
            modelName: record.model_name,
            tokenUsage: record.token_usage,
            createdAt: record.created_at
        };
        res.json({
            success: true,
            data: formattedRecord
        });
    }
    catch (error) {
        next(error);
    }
});
// Create new record with both thumbnails and original images
router.post('/', async (req, res, next) => {
    try {
        const data = validateRequest_js_1.createRecordSchema.parse(req.body);
        const db = await (0, database_js_1.getDatabaseSync)();
        db.run(`
      INSERT INTO generation_records 
      (feature_type, prompt, upload_images, generated_images, upload_images_original, generated_images_original, model_provider, model_name, token_usage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            data.featureType,
            data.prompt || null,
            data.uploadImages || null, // thumbnails
            data.generatedImages || null, // thumbnails
            data.uploadImagesOriginal || null, // original images
            data.generatedImagesOriginal || null, // original images
            data.modelProvider,
            data.modelName,
            data.tokenUsage
        ]);
        const lastIdResult = db.exec('SELECT last_insert_rowid() as id');
        const lastId = lastIdResult[0]?.values[0]?.[0];
        (0, database_js_1.saveDatabase)();
        res.json({
            success: true,
            data: { id: lastId }
        });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({ success: false, error: error.errors });
        }
        else {
            next(error);
        }
    }
});
// Delete record
router.delete('/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ success: false, error: 'Invalid record ID' });
            return;
        }
        const db = await (0, database_js_1.getDatabaseSync)();
        const beforeCount = db.exec('SELECT COUNT(*) FROM generation_records WHERE id = ?', [id]);
        const countBefore = beforeCount[0]?.values[0]?.[0] || 0;
        db.run('DELETE FROM generation_records WHERE id = ?', [id]);
        const afterCount = db.exec('SELECT COUNT(*) FROM generation_records WHERE id = ?', [id]);
        const countAfter = afterCount[0]?.values[0]?.[0] || 0;
        if (countBefore === countAfter) {
            res.status(404).json({ success: false, error: 'Record not found' });
            return;
        }
        (0, database_js_1.saveDatabase)();
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=records.js.map