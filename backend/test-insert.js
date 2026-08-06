require('dotenv').config()
const { Pool } = require('pg')

const p = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function test() {
  try {
    const r = await p.query(
      "INSERT INTO events (session_id, type, label, section, progress, ip_address) VALUES ((SELECT id FROM sessions WHERE visitor_id='mshb5uva2erguyku'), 'test', 'Test Insert', 'sec-landing', 10, '127.0.0.1')"
    )
    console.log('INSERT OK:', r.rowCount)
  } catch (e) {
    console.error('INSERT FAIL:', e.message)
    console.error('Detail:', e.detail)
  }

  try {
    await p.query("DELETE FROM events WHERE type = 'test'")
    console.log('Cleanup OK')
  } catch (e) {
    console.error('Cleanup FAIL:', e.message)
  }

  p.end()
}

test()
