import { NotificationType, NotificationTrigger } from '../src/generated/prisma/client.js';
import { createPrismaClient } from '../src/lib/prisma.js';

const prisma = createPrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default app settings
  await prisma.appSettings.upsert({
    where: { id: 'app-settings' },
    update: {},
    create: {
      id: 'app-settings',
      githubOrg: process.env.GITHUB_ORG || 'your-organization',
      scanIntervalMinutes: 60,
    },
  });

  // Create default in-app notification config
  await prisma.notificationConfig.upsert({
    where: {
      type_name: {
        type: NotificationType.inApp,
        name: 'In-App Notifications',
      },
    },
    update: {},
    create: {
      type: NotificationType.inApp,
      name: 'In-App Notifications',
      enabled: true,
      config: {},
      triggers: [
        NotificationTrigger.critical,
        NotificationTrigger.newAdoption,
        NotificationTrigger.scanComplete,
      ],
    },
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
