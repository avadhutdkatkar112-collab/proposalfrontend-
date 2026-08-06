import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../db'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

// Login
router.post('/login', async (req, res: Response) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' })
    }

    const result = await query('SELECT * FROM admins WHERE username = $1', [username])

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const admin = result.rows[0]
    const valid = await bcrypt.compare(password, admin.password_hash)

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign({ adminId: admin.id }, JWT_SECRET, { expiresIn: '24h' })

    res.json({ token, username: admin.username })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Verify token
router.get('/verify', (req, res: Response) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false })
  }

  const token = authHeader.split(' ')[1]

  try {
    jwt.verify(token, JWT_SECRET)
    res.json({ valid: true })
  } catch {
    res.status(401).json({ valid: false })
  }
})

export default router
