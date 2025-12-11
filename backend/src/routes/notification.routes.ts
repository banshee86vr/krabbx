import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getStorage, type NotificationType, type NotificationTrigger } from '../storage/index.js';
import { NotificationService } from '../services/notification.service.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// Valid notification types and triggers
const NOTIFICATION_TYPES = ['teams', 'email', 'inApp'] as const;
const NOTIFICATION_TRIGGERS = ['critical', 'newAdoption', 'stalePR', 'scanComplete'] as const;

// Validation schemas
const createConfigSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  config: z.object({
    webhookUrl: z.string().url().optional(),
    recipients: z.array(z.string().email()).optional(),
  }),
  triggers: z.array(z.enum(NOTIFICATION_TRIGGERS)),
});

const updateConfigSchema = createConfigSchema.partial();

// GET /api/notifications/config - Get all notification configurations
router.get('/config', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const storage = getStorage();
    const configs = await storage.getNotificationConfigs();
    res.json(configs);
  } catch (error) {
    next(error);
  }
});

// POST /api/notifications/config - Create new notification configuration
router.post('/config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createConfigSchema.parse(req.body);
    const storage = getStorage();

    const config = await storage.createNotificationConfig({
      type: data.type as NotificationType,
      name: data.name,
      enabled: data.enabled,
      config: data.config,
      triggers: data.triggers as NotificationTrigger[],
    });

    res.status(201).json(config);
  } catch (error) {
    next(error);
  }
});

// PUT /api/notifications/config/:id - Update notification configuration
router.put('/config/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = updateConfigSchema.parse(req.body);
    const storage = getStorage();

    const existing = await storage.getNotificationConfigById(id);

    if (!existing) {
      throw new AppError(404, 'Notification configuration not found');
    }

    const updatedConfig = await storage.updateNotificationConfig(id, {
      ...(data.type && { type: data.type as NotificationType }),
      ...(data.name && { name: data.name }),
      ...(data.enabled !== undefined && { enabled: data.enabled }),
      ...(data.config && { config: data.config }),
      ...(data.triggers && { triggers: data.triggers as NotificationTrigger[] }),
    });

    res.json(updatedConfig);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notifications/config/:id - Delete notification configuration
router.delete('/config/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const storage = getStorage();

    const existing = await storage.getNotificationConfigById(id);

    if (!existing) {
      throw new AppError(404, 'Notification configuration not found');
    }

    await storage.deleteNotificationConfig(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// POST /api/notifications/test - Send test notification
router.post('/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.body as { type: NotificationType };

    if (!type || !NOTIFICATION_TYPES.includes(type as typeof NOTIFICATION_TYPES[number])) {
      throw new AppError(400, 'Invalid notification type');
    }

    const io = req.app.get('io');
    const notificationService = new NotificationService(io);
    const success = await notificationService.testNotification(type);

    if (success) {
      res.json({ message: 'Test notification sent successfully' });
    } else {
      throw new AppError(500, 'Failed to send test notification');
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/notifications/history - Get notification history
router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const type = req.query.type as NotificationType | undefined;
    const storage = getStorage();

    const { data: history, total } = await storage.getNotificationHistory(
      { skip, take: limit },
      type
    );

    res.json({
      data: history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/notifications/triggers - Get available triggers
router.get('/triggers', (_req: Request, res: Response) => {
  res.json(NOTIFICATION_TRIGGERS);
});

export { router as notificationRoutes };
