import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/db/schema';

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (dbInstance) {
    return dbInstance;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured');
  }

  const pool = new Pool({ connectionString });
  dbInstance = drizzle(pool, { schema });
  return dbInstance;
}
