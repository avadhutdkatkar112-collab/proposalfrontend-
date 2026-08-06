import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL

export const pool = new Pool({
  connectionString: dbUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  ssl: { rejectUnauthorized: false },
})

pool.on('error', (err) => {
  console.error('Unexpected database error:', err)
})

export async function query(text: string, params?: unknown[]) {
  const start = Date.now()
  const res = await pool.query(text, params)
  const duration = Date.now() - start
  if (duration > 1000) {
    console.warn(`Slow query (${duration}ms):`, text.slice(0, 80))
  }
  return res
}
