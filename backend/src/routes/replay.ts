import { Router, Response } from 'express'
import { query } from '../db'

const router = Router()

// Batch insert replay events
router.post('/', async (req, res: Response) => {
  try {
    const { visitorId, events } = req.body

    if (!visitorId || !events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'visitorId and events array required' })
    }

    const sessionRes = await query('SELECT id FROM sessions WHERE visitor_id = $1', [visitorId])
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const sessionId = sessionRes.rows[0].id

    for (const ev of events) {
      await query(
        'INSERT INTO replay_events (session_id, type, data, ts) VALUES ($1, $2, $3, $4)',
        [sessionId, ev.type, JSON.stringify(ev.data), ev.ts]
      )
    }

    res.json({ ok: true, count: events.length })
  } catch (err) {
    console.error('Replay insert error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get replay events for a session
router.get('/:visitorId', async (req, res: Response) => {
  try {
    const { visitorId } = req.params

    const sessionRes = await query('SELECT id FROM sessions WHERE visitor_id = $1', [visitorId])
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const eventsRes = await query(
      'SELECT type, data, ts::int AS ts FROM replay_events WHERE session_id = $1 ORDER BY ts ASC',
      [sessionRes.rows[0].id]
    )

    res.json(eventsRes.rows)
  } catch (err) {
    console.error('Replay fetch error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete replay events for a session
router.delete('/:visitorId', async (req, res: Response) => {
  try {
    const { visitorId } = req.params

    const sessionRes = await query('SELECT id FROM sessions WHERE visitor_id = $1', [visitorId])
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    await query('DELETE FROM replay_events WHERE session_id = $1', [sessionRes.rows[0].id])
    res.json({ ok: true })
  } catch (err) {
    console.error('Replay delete error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
