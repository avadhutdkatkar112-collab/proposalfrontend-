require('dotenv').config()
const { Pool } = require('pg')

const p = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function migrate() {
  try {
    await p.query(`
      CREATE TABLE IF NOT EXISTS replay_events (
        id SERIAL PRIMARY KEY,
        session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        data jsonb NOT NULL,
        ts BIGINT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_replay_session ON replay_events(session_id);
      CREATE INDEX IF NOT EXISTS idx_replay_ts ON replay_events(session_id, ts);
    `)
    console.log('replay_events table created')
  } catch (e) {
    console.error('Error:', e.message)
  }
  p.end()
}

migrate()
