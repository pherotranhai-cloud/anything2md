import { Router, Request, Response, RequestHandler } from 'express';
import multer from 'multer';
import storageService from '../services/storage_service';
import webhookService from '../services/webhook_service';
import parser from '../core/parser';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const upload = multer({ dest: storageService.getTempDir() });

// Wrapper to help with typings for Express
const parseSyncHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    let config = {};
    if (req.body.config) {
      try {
        config = JSON.parse(req.body.config);
      } catch(e) {
        res.status(400).json({ error: 'Invalid JSON string in config parameter' });
        return;
      }
    }
    
    // Parse PowerPoint -> Markdown + AST
    const result = await parser.parseFile(file.path, config);
    
    // Clean up
    await storageService.cleanupFile(file.path);

    res.json(result);
  } catch (error) {
    console.error('Sync conversion error:', error);
    res.status(500).json({ error: 'Failed to process file' });
  }
};

const parseAsyncHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    const webhookUrl = req.body.webhook_url;
    
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    if (!webhookUrl) {
      res.status(400).json({ error: 'webhook_url is required for async processing' });
      return;
    }

    let config = {};
    if (req.body.config) {
      try {
        config = JSON.parse(req.body.config);
      } catch(e) {
        res.status(400).json({ error: 'Invalid JSON string in config parameter' });
        return;
      }
    }

    const jobId = uuidv4();

    // Process asynchronously
    setImmediate(async () => {
      try {
        const result = await parser.parseFile(file.path, config);
        await webhookService.triggerWebhook(webhookUrl, { job_id: jobId, status: 'success', result });
      } catch (err: any) {
        console.error('Async processing failed:', err);
        await webhookService.triggerWebhook(webhookUrl, { job_id: jobId, status: 'failed', error: err.message || String(err) });
      } finally {
        await storageService.cleanupFile(file.path);
      }
    });

    res.json({ job_id: jobId, status: 'processing' });
  } catch (error) {
    console.error('Async conversion setup error:', error);
    res.status(500).json({ error: 'Failed to start async job' });
  }
};

router.post('/convert/sync', upload.single('file'), parseSyncHandler);
router.post('/convert/async', upload.single('file'), parseAsyncHandler);

export default router;
