import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // process.env (e não env()) para que `prisma generate` funcione no build sem banco.
    url: process.env.DATABASE_URL ?? '',
  },
});
