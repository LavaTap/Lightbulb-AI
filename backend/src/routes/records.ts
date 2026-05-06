import { Router, Request, Response, NextFunction } from 'express';
import { getDatabaseSync, saveDatabase } from '../database.js';
import { createRecordSchema } from '../middleware/validateRequest.js';
import { ZodError } from 'zod';
import type { GenerationRecord } from '../types/index.js';

const router = Router();

// Helper: map sql.js exec result to array of objects
function mapResult(result: import('sql.js').QueryExecResult[] | undefined): any[] {
  if (!result || result.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col: string, idx: number) => {
      obj[col] = row[idx];
    });
    return obj;
  });
}

// Get usage statistics (must be before /:id routes)
router.get('/statistics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = await getDatabaseSync();

    const providerResult = db.exec(
      `SELECT model_provider, COUNT(*) as count
       FROM generation_records WHERE feature_type != 'chat'
       GROUP BY model_provider ORDER BY count DESC`
    );
    const modelProviderDistribution = mapResult(providerResult);

    const dailyResult = db.exec(
      `SELECT DATE(created_at) as date, SUM(token_usage) as total_tokens
       FROM generation_records WHERE feature_type != 'chat'
       GROUP BY DATE(created_at) ORDER BY date ASC`
    );
    const dailyTokenUsage = mapResult(dailyResult);

    const modelResult = db.exec(
      `SELECT model_name, SUM(token_usage) as total_tokens
       FROM generation_records WHERE feature_type != 'chat'
       GROUP BY model_name ORDER BY total_tokens DESC`
    );
    const tokenUsageByModel = mapResult(modelResult);

    const summaryResult = db.exec(
      `SELECT COUNT(*) as total_records, COALESCE(SUM(token_usage), 0) as total_tokens
       FROM generation_records WHERE feature_type != 'chat'`
    );
    const summary = mapResult(summaryResult);

    res.json({
      success: true,
      data: {
        totalRecords: summary[0]?.total_records || 0,
        totalTokens: summary[0]?.total_tokens || 0,
        modelProviderDistribution: modelProviderDistribution.map((r: any) => ({
          provider: r.model_provider,
          count: r.count,
        })),
        dailyTokenUsage: dailyTokenUsage.map((r: any) => ({
          date: r.date,
          totalTokens: r.total_tokens,
        })),
        tokenUsageByModel: tokenUsageByModel.map((r: any) => ({
          modelName: r.model_name,
          totalTokens: r.total_tokens,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

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

    const records = mapResult(recordsResult);

    const formattedRecords: GenerationRecord[] = records.map((r: any) => ({
      id: r.id,
      featureType: r.feature_type,
      prompt: r.prompt,
      uploadImages: r.upload_images,
      generatedImages: r.generated_images,
      uploadImagesOriginal: r.upload_images_original,   // 原图
      generatedImagesOriginal: r.generated_images_original, // 原图
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
      (feature_type, prompt, upload_images, generated_images, upload_images_original, generated_images_original, model_provider, model_name, token_usage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.featureType,
      data.prompt || null,
      data.uploadImages || null,
      data.generatedImages || null,
      data.uploadImagesOriginal || null,  // 原图
      data.generatedImagesOriginal || null, // 原图
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
