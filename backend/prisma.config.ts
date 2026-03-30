import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
  },
  datasource: {
    // Prisma 7 requires a datasource URL during generate, even when CI only builds the client.
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/krabbx',
  },
});
