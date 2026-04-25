import { Router, Request, Response, NextFunction } from 'express';
import { getDatabaseSync, saveDatabase } from '../database.js';
import { createRecordSchema } from '../middleware/validateRequest.js';
import { ZodError } from 'zod';
import type { GenerationRecord } from '../types/index.js';

const router = Router();

// Get all records with pagination
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const offset = (page - 1) * pageSize;
    
    const db = await getDatabaseSync();
    
    const totalResult = db.exec('SELECT COUNT(*) as count FROM generation_records');
    const total = totalResult[0]?.values[0]?.[0] as number || 0;
    
    const recordsResult = db.exec(`
      SELECT * FROM generation_records 
      ORDER BY created_at DESC 
      LIMIT ${pageSize} OFFSET ${offset}
    `);
    
    const columns = recordsResult[0]?.columns || [];
    const records: any[] = (recordsResult[0]?.values || []).map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, idx: number) => {
        obj[col] = row[idx];
      });
      return obj;
    });
    
    const formattedRecords: GenerationRecord[] = records.map((r: any) => ({
      id: r.id,
      featureType: r.feature_type,
      prompt: r.prompt,
      uploadImages: r.upload_images,
      generatedImages: r.generated_images,
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
  } catch (error) {
    next(error);
  }
});

// Create new record
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createRecordSchema.parse(req.body);
    
    const db = await getDatabaseSync();
    
    db.run(`
      INSERT INTO generation_records 
      (feature_type, prompt, upload_images, generated_images, model_provider, model_name, token_usage)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      data.featureType,
      data.prompt || null,
      data.uploadImages || null,
      data.generatedImages || null,
      data.modelProvider,
      data.modelName,
      data.tokenUsage
    ]);
    
    const lastIdResult = db.exec('SELECT last_insert_rowid() as id');
    const lastId = lastIdResult[0]?.values[0]?.[0] as number;
    
    saveDatabase();
    
    res.json({
      success: true,
      data: { id: lastId }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors });
    } else {
      next(error);
    }
  }
});

// Delete record
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid record ID' });
      return;
    }
    
    const db = await getDatabaseSync();
    
    const beforeCount = db.exec('SELECT COUNT(*) FROM generation_records WHERE id = ?', [id]);
    const countBefore = beforeCount[0]?.values[0]?.[0] as number || 0;
    
    db.run('DELETE FROM generation_records WHERE id = ?', [id]);
    
    const afterCount = db.exec('SELECT COUNT(*) FROM generation_records WHERE id = ?', [id]);
    const countAfter = afterCount[0]?.values[0]?.[0] as number || 0;
    
    if (countBefore === countAfter) {
      res.status(404).json({ success: false, error: 'Record not found' });
      return;
    }
    
    saveDatabase();
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
