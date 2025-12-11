import nodemailer from 'nodemailer';
import { Server } from 'socket.io';
import { config } from '../config/env.js';
import { getStorage, type NotificationType, type NotificationTrigger, type NotificationStatus } from '../storage/index.js';

interface NotificationPayload {
  subject: string;
  content: string;
  trigger: NotificationTrigger;
  data?: Record<string, unknown>;
}

export class NotificationService {
  private emailTransporter: nodemailer.Transporter | null = null;

  constructor(private io?: Server) {
    if (config.email.host && config.email.user && config.email.pass) {
      this.emailTransporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port || 587,
        secure: config.email.secure,
        auth: {
          user: config.email.user,
          pass: config.email.pass,
        },
      });
    }
  }

  async sendNotification(payload: NotificationPayload): Promise<void> {
    const storage = getStorage();
    const configs = await storage.getNotificationConfigsByTrigger(payload.trigger);

    for (const configItem of configs) {
      try {
        switch (configItem.type) {
          case 'teams':
            await this.sendTeamsNotification(configItem.config, payload);
            break;
          case 'email':
            await this.sendEmailNotification(configItem.config, payload);
            break;
          case 'inApp':
            await this.sendInAppNotification(payload);
            break;
        }

        await this.logNotification(configItem.type, payload, 'sent');
      } catch (error) {
        console.error(`Failed to send ${configItem.type} notification:`, error);
        await this.logNotification(
          configItem.type,
          payload,
          'failed',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }
  }

  private async sendTeamsNotification(
    notificationConfig: Record<string, unknown>,
    payload: NotificationPayload
  ): Promise<void> {
    const webhookUrl = (notificationConfig.webhookUrl as string) || config.teams.webhookUrl;

    if (!webhookUrl) {
      throw new Error('Teams webhook URL not configured');
    }

    const card = this.buildTeamsAdaptiveCard(payload);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });

    if (!response.ok) {
      throw new Error(`Teams webhook failed: ${response.statusText}`);
    }
  }

  private buildTeamsAdaptiveCard(payload: NotificationPayload) {
    const themeColor = this.getThemeColor(payload.trigger);

    return {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.4',
            body: [
              {
                type: 'Container',
                style: themeColor,
                items: [
                  {
                    type: 'TextBlock',
                    text: '🤖 Renovate Bot Dashboard',
                    weight: 'bolder',
                    size: 'medium',
                    color: 'light',
                  },
                ],
              },
              {
                type: 'Container',
                items: [
                  {
                    type: 'TextBlock',
                    text: payload.subject,
                    weight: 'bolder',
                    size: 'large',
                    wrap: true,
                  },
                  {
                    type: 'TextBlock',
                    text: payload.content,
                    wrap: true,
                    spacing: 'medium',
                  },
                ],
              },
            ],
            actions: [
              {
                type: 'Action.OpenUrl',
                title: 'View Dashboard',
                url: config.frontendUrl,
              },
            ],
          },
        },
      ],
    };
  }

  private getThemeColor(trigger: NotificationTrigger): string {
    switch (trigger) {
      case 'critical':
        return 'attention';
      case 'stalePR':
        return 'warning';
      case 'newAdoption':
        return 'good';
      default:
        return 'accent';
    }
  }

  private async sendEmailNotification(
    notificationConfig: Record<string, unknown>,
    payload: NotificationPayload
  ): Promise<void> {
    if (!this.emailTransporter) {
      throw new Error('Email not configured');
    }

    const recipients = notificationConfig.recipients as string[];
    if (!recipients?.length) {
      throw new Error('No email recipients configured');
    }

    const html = this.buildEmailHtml(payload);

    await this.emailTransporter.sendMail({
      from: config.email.from || 'noreply@renovate-dashboard.local',
      to: recipients.join(', '),
      subject: `[RenovateBot Dashboard] ${payload.subject}`,
      html,
    });
  }

  private buildEmailHtml(payload: NotificationPayload): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .footer { background: #f3f4f6; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; }
          .button { display: inline-block; background: #4f46e5; color: white; padding: 10px 20px;
                    text-decoration: none; border-radius: 6px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🤖 Renovate Bot Dashboard</h1>
          </div>
          <div class="content">
            <h2>${payload.subject}</h2>
            <p>${payload.content}</p>
            <a href="${config.frontendUrl}" class="button">View Dashboard</a>
          </div>
          <div class="footer">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              This is an automated notification from Renovate Bot Dashboard
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private async sendInAppNotification(payload: NotificationPayload): Promise<void> {
    this.io?.emit('notification', {
      id: Date.now().toString(),
      subject: payload.subject,
      content: payload.content,
      trigger: payload.trigger,
      timestamp: new Date().toISOString(),
      read: false,
    });
  }

  private async logNotification(
    type: NotificationType,
    payload: NotificationPayload,
    status: NotificationStatus,
    errorMessage?: string
  ): Promise<void> {
    const storage = getStorage();
    await storage.createNotificationHistory({
      type,
      trigger: payload.trigger,
      recipient: type === 'inApp' ? 'all' : 'configured',
      subject: payload.subject,
      content: payload.content,
      status,
      errorMessage: errorMessage || null,
    });
  }

  async sendCriticalUpdateAlert(updates: { repo: string; dependency: string; updateType: string }[]): Promise<void> {
    const content = updates
      .map(u => `• ${u.repo}: ${u.dependency} (${u.updateType} update)`)
      .join('\n');

    await this.sendNotification({
      subject: `⚠️ Critical Updates Detected (${updates.length})`,
      content: `The following repositories have critical dependency updates:\n\n${content}`,
      trigger: 'critical',
      data: { updates },
    });
  }

  async sendWeeklySummary(stats: {
    totalRepos: number;
    adoptedRepos: number;
    outdatedDeps: number;
    newUpdates: number;
  }): Promise<void> {
    await this.sendNotification({
      subject: '📊 Weekly Renovate Summary',
      content: `
        Here's your weekly dependency update summary:

        📁 Total Repositories: ${stats.totalRepos}
        ✅ Renovate Adopted: ${stats.adoptedRepos} (${Math.round((stats.adoptedRepos / stats.totalRepos) * 100)}%)
        ⚠️ Outdated Dependencies: ${stats.outdatedDeps}
        🆕 New Updates This Week: ${stats.newUpdates}
      `.trim(),
      trigger: 'scanComplete',
      data: stats,
    });
  }

  async sendNewAdoptionNotification(repoName: string): Promise<void> {
    await this.sendNotification({
      subject: '🎉 New Renovate Adoption',
      content: `Great news! The repository "${repoName}" has adopted Renovate Bot for dependency management.`,
      trigger: 'newAdoption',
      data: { repository: repoName },
    });
  }

  async testNotification(type: NotificationType): Promise<boolean> {
    try {
      const payload: NotificationPayload = {
        subject: '🧪 Test Notification',
        content: 'This is a test notification from Renovate Bot Dashboard. If you received this, notifications are working correctly!',
        trigger: 'scanComplete',
      };

      const storage = getStorage();

      switch (type) {
        case 'teams':
          await this.sendTeamsNotification({}, payload);
          break;
        case 'email': {
          const configs = await storage.getNotificationConfigs();
          const emailConfig = configs.find(c => c.type === 'email' && c.enabled);
          if (emailConfig) {
            await this.sendEmailNotification(emailConfig.config, payload);
          }
          break;
        }
        case 'inApp':
          await this.sendInAppNotification(payload);
          break;
      }

      return true;
    } catch (error) {
      console.error('Test notification failed:', error);
      return false;
    }
  }
}
