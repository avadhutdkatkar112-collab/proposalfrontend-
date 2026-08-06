require('dotenv').config()
const { Pool } = require('pg')

const p = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function check() {
  try {
    const e = await p.query(`SELECT COUNT(*) as total FROM events`)
    console.log('Total events:', e.rows[0].total)
    const recent = await p.query(`SELECT type, label, created_at FROM events ORDER BY created_at DESC LIMIT 10`)
    console.log('Recent events:', JSON.stringify(recent.rows, null, 2))
    
    // Check if session_id references work
    const bad = await p.query(`
      SELECT e.session_id, e.type, s.visitor_id 
      FROM events e 
      LEFT JOIN sessions s ON s.id = e.session_id 
      WHERE s.id IS NULL
      LIMIT 5
    `)
    console.log('Orphaned events:', JSON.stringify(bad.rows))
  } catch (e) {
    console.error('Error:', e.message)
  }
  p.end()
}

check()
