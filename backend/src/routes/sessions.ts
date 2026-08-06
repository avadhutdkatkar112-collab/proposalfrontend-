import { Router, Response } from 'express'
import { query } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { broadcast } from '../ws'

const router = Router()

// Get all sessions (admin)
router.get('/', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    // Mark sessions offline if no heartbeat in 30s (heartbeat interval is 15s)
    await query(
      `UPDATE sessions SET is_online = false
       WHERE is_online = true AND last_active_at < NOW() - INTERVAL '30 seconds'`
    )

    const result = await query(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM events e WHERE e.session_id = s.id) as event_count
       FROM sessions s
       ORDER BY s.last_active_at DESC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Sessions list error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get single session with events (admin)
router.get('/:visitorId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { visitorId } = req.params

    const sessionRes = await query(
      'SELECT * FROM sessions WHERE visitor_id = $1',
      [visitorId]
    )

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const sessionId = sessionRes.rows[0].id

    // Mark offline if no heartbeat in 30s
    await query(
      `UPDATE sessions SET is_online = false
       WHERE id = $1 AND last_active_at < NOW() - INTERVAL '30 seconds'`,
      [sessionId]
    )

    const eventsRes = await query(
      'SELECT * FROM events WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    )

    res.json({
      ...sessionRes.rows[0],
      is_online: sessionRes.rows[0].last_active_at
        ? Date.now() - new Date(sessionRes.rows[0].last_active_at).getTime() < 30000
        : false,
      events: eventsRes.rows,
    })
  } catch (err) {
    console.error('Session detail error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Reset/archive ALL sessions (admin)
router.delete('/', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    // Archive all sessions
    await query(
      `UPDATE sessions SET 
        visitor_id = visitor_id || '_archived_' || EXTRACT(EPOCH FROM NOW())::INTEGER,
        is_online = false,
        current_section = NULL,
        progress = 0,
        response = NULL,
        responses = '[]'::jsonb,
        responded_at = NULL
       WHERE visitor_id NOT LIKE '%_archived_%'`
    )

    // Delete all events
    await query('DELETE FROM events WHERE session_id IN (SELECT id FROM sessions)')

    broadcast({
      type: 'all_sessions_reset',
      data: {},
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('Reset all sessions error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Reset/archive session (admin)
router.delete('/:visitorId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { visitorId } = req.params

    // Get session first
    const sessionRes = await query(
      'SELECT id FROM sessions WHERE visitor_id = $1',
      [visitorId]
    )

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const sessionId = sessionRes.rows[0].id

    // Archive: rename visitor_id to indicate archived
    await query(
      `UPDATE sessions SET 
        visitor_id = visitor_id || '_archived_' || EXTRACT(EPOCH FROM NOW())::INTEGER,
        is_online = false,
        current_section = NULL,
        progress = 0,
        response = NULL,
        responses = '[]'::jsonb,
        responded_at = NULL
       WHERE id = $1`,
      [sessionId]
    )

    // Delete events
    await query('DELETE FROM events WHERE session_id = $1', [sessionId])

    broadcast({
      type: 'session_reset',
      data: { visitorId, sessionId },
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('Session reset error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
