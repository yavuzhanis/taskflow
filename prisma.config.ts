import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js uses .env.local in development. Prisma CLI does not load it by default,
// so load it explicitly first and fall back to .env when needed.
config({ path: ".env.local" });
config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
