import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js reads .env.local automatically; the Prisma CLI does not.
loadEnv({ path: ".env.local", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // The CLI (migrate / db push / studio) must go through the session-mode
    // pooler on port 5432. The transaction pooler (DATABASE_URL, 6543) cannot
    // run migrations. Runtime queries use DATABASE_URL via lib/prisma.ts.
    url: process.env.DIRECT_URL,
  },
});
