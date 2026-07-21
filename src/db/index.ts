import "server-only";

import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "@/db/schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Add your Neon connection string to .env.local (see .env.example).",
  );
}

// Neon HTTP driver: stateless fetch-based queries, ideal for serverless.
export const db = drizzle(databaseUrl, { schema });
