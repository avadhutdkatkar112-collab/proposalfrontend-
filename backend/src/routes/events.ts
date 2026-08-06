import { Router, Response } from 'express'
import { query } from '../db'
import { broadcast } from '../ws'

const router = Router()

interface GeoData {
  city?: string
  regionName?: string
  country?: string
  org?: string
}

async function lookupIp(ip: string): Promise<GeoData> {
  // Skip local/private IPs
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return {}
  }

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,country,org`)
    const data = await res.json() as Record<string, string>
    if (data.status === 'success') {
      return {
        city: data.city,
        regionName: data.regionName,
        country: data.country,
        org: data.org,
      }
    }
  } catch {
    // IP lookup failed, continue without geo data
  }
  return {}
}

function getClientIp(req: any): string {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim()
  }
  return req.socket?.remoteAddress || ''
}

// Post an event
router.post('/', async (req, res: Response) => {
  try {
    const { visitorId, type, label, section, progress } = req.body

    if (!visitorId || !type) {
      return res.status(400).json({ error: 'visitorId and type are required' })
    }

    const ip = getClientIp(req)
    const userAgent = req.headers['user-agent'] || ''

    // Geo lookup for new sessions or periodically
    let geo: GeoData = {}
    const existingSession = await query('SELECT id, ip_address FROM sessions WHERE visitor_id = $1', [visitorId])

    if (existingSession.rows.length === 0) {
      // New session — do geo lookup
      geo = await lookupIp(ip)
    }

    // Upsert session
    if (existingSession.rows.length === 0) {
      await query(
        `INSERT INTO sessions (visitor_id, is_online, current_section, progress, ip_address, ip_city, ip_region, ip_country, ip_org, user_agent, last_active_at)
         VALUES ($1, true, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [visitorId, section || null, progress || 0, ip, geo.city || null, geo.regionName || null, geo.country || null, geo.org || null, userAgent]
      )
    } else {
      await query(
        `UPDATE sessions SET
          is_online = true,
          current_section = COALESCE($1, current_section),
          progress = COALESCE($2, progress),
          last_active_at = NOW(),
          user_agent = COALESCE($3, user_agent)
         WHERE visitor_id = $4`,
        [section || null, progress || 0, userAgent, visitorId]
      )
    }

    // Get session id
    const sessionRes = await query('SELECT id FROM sessions WHERE visitor_id = $1', [visitorId])
    const sessionId = sessionRes.rows[0]?.id

    if (!sessionId) {
      return res.status(500).json({ error: 'Failed to find session' })
    }

    // Insert event (skip heartbeat)
    if (type !== 'heartbeat') {
      await query(
        'INSERT INTO events (session_id, type, label, section, progress, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
        [sessionId, type, label || type, section || null, progress || null, ip]
      )
    }

    // If response event, update session response
    if (type === 'response' && label) {
      const responseText = label.replace('Response Submitted: ', '')
      await query(
        `UPDATE sessions SET response = $1, responded_at = NOW() WHERE id = $2`,
        [responseText, sessionId]
      )
    }

    // Broadcast to admin dashboard
    broadcast({
      type: type === 'heartbeat' ? 'heartbeat' : 'new_event',
      data: {
        visitorId,
        sessionId,
        event: type !== 'heartbeat' ? { type, label, section, progress, createdAt: new Date().toISOString() } : null,
        isOnline: true,
        currentSection: section,
        progress,
        ip,
        city: geo.city,
        country: geo.country,
      },
    })

    res.json({ ok: true, sessionId })
  } catch (err) {
    console.error('Event error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Mark visitor offline
router.post('/offline', async (req, res: Response) => {
  try {
    const { visitorId } = req.body
    if (!visitorId) return res.status(400).json({ error: 'visitorId required' })

    await query(
      'UPDATE sessions SET is_online = false WHERE visitor_id = $1',
      [visitorId]
    )

    broadcast({
      type: 'visitor_offline',
      data: { visitorId },
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('Offline error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
