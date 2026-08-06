require('dotenv').config()
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const p = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function migrate() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'src', 'notify-triggers.sql'), 'utf8')
    await p.query(sql)
    console.log('NOTIFY triggers fixed successfully')
  } catch (e) {
    console.error('Error:', e.message)
  }
  p.end()
}

migrate()
