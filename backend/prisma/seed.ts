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
      githubOrg:
        process.env.GITHUB_TARGETS?.trim()?.split(',').map((t) => t.trim()).filter(Boolean).join(',') ||
        process.env.GITHUB_ORG?.trim() ||
        'your-organization',
      scanIntervalMinutes: 60,
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
