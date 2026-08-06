import bcrypt from 'bcryptjs'
import { query, pool } from './db'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config()

async function migrate() {
  try {
    // Run SQL migration
    const sqlPath = path.join(__dirname, 'migrate.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')
    await query(sql)
    console.log('Tables created')

    // Create default admin
    const username = 'admin'
    const password = 'proposal2024' // Change this!
    const hash = await bcrypt.hash(password, 10)

    await query(
      `INSERT INTO admins (username, password_hash) VALUES ($1, $2)
       ON CONFLICT (username) DO NOTHING`,
      [username, hash]
    )
    console.log(`Admin user created: ${username} / ${password}`)

    console.log('Migration complete!')
  } catch (err) {
    console.error('Migration failed:', err)
  } finally {
    await pool.end()
  }
}

migrate()
