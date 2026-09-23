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
    const period = (req.query.period as string) || 'week';
    const db = await getDatabaseSync();

    // Build date filter based on period
    let dateFilter = '';
    if (period === 'week') {
      dateFilter = "AND created_at >= date('now', '-7 days')";
    } else if (period === 'month') {
      dateFilter = "AND created_at >= date('now', '-30 days')";
    } else if (period === 'year') {
      dateFilter = "AND created_at >= date('now', '-365 days')";
    }
    // 'all' = no filter

    // Get total records and total tokens from both tables
    // generation_records for image generation, chat_messages for AI chat
    const genWhere = `1=1 ${dateFilter}`;
    const chatWhere = `1=1 ${dateFilter}`;

    // Get combined summary
    const summaryResult = db.exec(`
      SELECT
        (SELECT COUNT(*) FROM generation_records WHERE ${genWhere}) +
        (SELECT COUNT(*) FROM chat_messages WHERE ${chatWhere}) as total_records,
        COALESCE((SELECT COALESCE(SUM(token_usage), 0) FROM generation_records WHERE ${genWhere}), 0) +
        COALESCE((SELECT COALESCE(SUM(token_usage), 0) FROM chat_messages WHERE ${chatWhere}), 0) as total_tokens
    `);
    const summary = mapResult(summaryResult);

    // Model distribution (only from generation_records, chat messages don't have model per message)
    const modelDistResult = db.exec(
      `SELECT model_name, COUNT(*) as count
       FROM generation_records WHERE ${genWhere}
       GROUP BY model_name ORDER BY count DESC`
    );
    const modelDistribution = mapResult(modelDistResult);

    // Daily token usage from both tables combined
    const dailyResult = db.exec(`
      WITH daily_gen AS (
        SELECT DATE(created_at) as date, SUM(token_usage) as tokens
        FROM generation_records WHERE ${genWhere}
        GROUP BY DATE(created_at)
      ),
      daily_chat AS (
        SELECT DATE(created_at) as date, SUM(token_usage) as tokens
        FROM chat_messages WHERE ${chatWhere}
        GROUP BY DATE(created_at)
      )
      SELECT date, (COALESCE(daily_gen.tokens, 0) + COALESCE(daily_chat.tokens, 0)) as total_tokens
      FROM (
        SELECT date FROM daily_gen UNION SELECT date FROM daily_chat
      ) AS all_dates
      LEFT JOIN daily_gen USING(date)
      LEFT JOIN daily_chat USING(date)
      ORDER BY date ASC
    `);
    const dailyTokenUsage = mapResult(dailyResult);

    // Token usage by model from generation_records only
    // Chat messages don't track model per message at this time
    const modelResult = db.exec(
      `SELECT model_name, SUM(token_usage) as total_tokens
       FROM generation_records WHERE ${genWhere}
       GROUP BY model_name ORDER BY total_tokens DESC`
    );
    const tokenUsageByModel = mapResult(modelResult);

    res.json({
      success: true,
      data: {
        totalRecords: summary[0]?.total_records || 0,
        totalTokens: summary[0]?.total_tokens || 0,
        modelDistribution: modelDistribution.map((r: any) => ({
          modelName: r.model_name,
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
