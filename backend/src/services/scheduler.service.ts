import cron, { type ScheduledTask } from 'node-cron';
import { Server } from 'socket.io';
import { RenovateService } from './renovate.service.js';
import { getStorage } from '../storage/index.js';
import { config } from '../config/env.js';
import { logger } from '../lib/logger.js';

export class SchedulerService {
  private static instance: SchedulerService;
  private renovateService: RenovateService;
  private scanJob: ScheduledTask | null = null;

  private constructor(io?: Server) {
    this.renovateService = new RenovateService(io);
  }

  static getInstance(io?: Server): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService(io);
    }
    return SchedulerService.instance;
  }

  start(): void {
    this.scheduleScan();
    console.log('Scheduler started');
  }

  stop(): void {
    this.scanJob?.stop();
    console.log('Scheduler stopped');
  }

  private scheduleScan(): void {
    const intervalMinutes = config.scheduler.scanIntervalMinutes;
    // Convert minutes to cron expression (e.g., 60 -> "0 * * * *" for every hour)
    const cronExpression = intervalMinutes >= 60
      ? `0 */${Math.floor(intervalMinutes / 60)} * * *`
      : `*/${intervalMinutes} * * * *`;

    logger.info('Scheduling scans', { cronExpression });

    this.scanJob = cron.schedule(cronExpression, async () => {
      logger.info('Starting scheduled organization scan');
      try {
        const results = await this.renovateService.scanOrganization();
        logger.info('Scheduled scan completed', { repositoriesScanned: results.length });

        // Update last scan time
        const storage = getStorage();
        await storage.upsertAppSettings({
          githubOrg: config.github.targets.join(','),
          scanIntervalMinutes: intervalMinutes,
          lastFullScanAt: new Date(),
        });
      } catch (error) {
        logger.error('Scheduled scan failed', error);
      }
    });
  }

  async runManualScan(): Promise<void> {
    logger.info('Starting manual organization scan');
    await this.renovateService.scanOrganization();
  }
}
