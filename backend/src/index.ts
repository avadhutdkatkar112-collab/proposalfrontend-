import express from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { pool } from './db'
import { initWebSocket } from './ws'
import eventsRouter from './routes/events'
import sessionsRouter from './routes/sessions'
import authRouter from './routes/auth'
import { createServer } from 'http'

dotenv.config()

const app = express()
const server = createServer(app)
const PORT = process.env.PORT || 3001

// Initialize WebSocket
initWebSocket(server)

// Middleware
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
  'https://proposalfrontend.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(null, true)
    }
  },
  credentials: true,
}))
app.use(express.json())

// API Routes
app.use('/api/events', eventsRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/auth', authRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/', (_req, res) => {
  res.json({ 
    name: 'Proposal Backend API',
    endpoints: {
      health: '/api/health',
      events: '/api/events',
      sessions: '/api/sessions',
      auth: '/api/auth',
      admin: '/admin'
    }
  })
})

// Serve Admin Dashboard at /admin
const adminDist = path.join(__dirname, '..', 'public', 'admin')
app.use('/admin', express.static(adminDist))
app.use('/admin', (_req, res) => {
  res.sendFile(path.join(adminDist, 'index.html'))
})

// Start server
async function start() {
  try {
    await pool.query('SELECT NOW()')
    console.log('Database connected')

    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
      console.log(`  Proposal : http://localhost:${PORT}/`)
      console.log(`  Admin    : http://localhost:${PORT}/admin`)
      console.log(`  API      : http://localhost:${PORT}/api/health`)
    })
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()
