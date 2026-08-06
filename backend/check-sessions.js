require('dotenv').config()
const { Pool } = require('pg')

const p = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function check() {
  try {
    const s = await p.query(`
      SELECT s.visitor_id, s.response, s.responses, s.progress, s.current_section,
        (SELECT COUNT(*) FROM events e WHERE e.session_id = s.id) as event_count
      FROM sessions s 
      WHERE s.visitor_id NOT LIKE '%_archived_%'
      ORDER BY s.last_active_at DESC LIMIT 5
    `)
    console.log('Recent sessions:', JSON.stringify(s.rows, null, 2))

    // Check events for recent sessions
    for (const row of s.rows) {
      const sid = await p.query('SELECT id FROM sessions WHERE visitor_id = $1', [row.visitor_id])
      if (sid.rows[0]) {
        const events = await p.query('SELECT type, label, created_at FROM events WHERE session_id = $1 ORDER BY created_at', [sid.rows[0].id])
        console.log(`\nEvents for ${row.visitor_id} (${events.rows.length}):`, JSON.stringify(events.rows))
      }
    }
  } catch (e) {
    console.error('Error:', e.message)
  }
  p.end()
}

check()
