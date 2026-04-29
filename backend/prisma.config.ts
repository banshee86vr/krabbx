import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/** Empty string must be treated as unset — otherwise `??` keeps "" and migrate deploy fails. */
function datasourceUrl(): string {
  const raw = process.env.DATABASE_URL?.trim();
  if (raw) return raw;
  return 'postgresql://postgres:postgres@localhost:5432/krabbx';
}

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
  },
  datasource: {
    // Prisma 7 requires a datasource URL during generate, even when CI only builds the client.
    url: datasourceUrl(),
  },
});
