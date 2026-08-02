import { Pool } from 'pg';
import Redis from 'ioredis';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export { redis };
export default pool;
