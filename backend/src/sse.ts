import { Response } from 'express'
import { Pool } from 'pg'

interface SSEClient {
  id: string
  res: Response
}

let clients: SSEClient[] = []
let clientIdCounter = 0

export function addSSEClient(res: Response): string {
  const id = `client_${++clientIdCounter}`

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  res.write(':\n\n')

  clients.push({ id, res })

  res.on('close', () => {
    clients = clients.filter((c) => c.id !== id)
    console.log(`SSE client disconnected (${clients.length} total)`)
  })

  console.log(`SSE client connected (${clients.length} total)`)
  return id
}

export function broadcastSSE(event: string, data: unknown) {
  if (clients.length === 0) return
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  clients.forEach((client) => {
    client.res.write(payload)
  })
}

export function getSSEClientCount(): number {
  return clients.length
}

export function startPGListener(pool: Pool) {
  const listener = pool.connect()

  listener.then((client) => {
    client.query('LISTEN admin_changes')

    client.on('notification', async (msg) => {
      try {
        const payload = JSON.parse(msg.payload || '{}')
        const { table, operation, id, visitor_id } = payload

        if (table === 'sessions') {
          const sessionRes = await pool.query(
            `SELECT visitor_id, is_online, current_section, progress, response, responses, responded_at,
                    ip_city, ip_country, ip_org, last_active_at
             FROM sessions WHERE visitor_id = $1`,
            [visitor_id]
          )

          if (sessionRes.rows.length > 0) {
            broadcastSSE('session.updated', {
              visitorId: visitor_id,
              session: sessionRes.rows[0],
            })
          }
        }

        if (table === 'events' && operation === 'INSERT') {
          const eventRes = await pool.query(
            `SELECT e.type, e.label, e.section, e.progress, e.created_at, s.visitor_id
             FROM events e JOIN sessions s ON s.id = e.session_id
             WHERE e.id = $1`,
            [id]
          )

          if (eventRes.rows.length > 0) {
            const ev = eventRes.rows[0]
            broadcastSSE('event.created', {
              visitorId: ev.visitor_id,
              event: {
                type: ev.type,
                label: ev.label,
                section: ev.section,
                progress: ev.progress,
                created_at: ev.created_at,
              },
            })
          }
        }
      } catch (err) {
        console.error('SSE NOTIFY error:', err)
      }
    })

    client.on('error', (err) => {
      console.error('PG LISTEN error:', err)
      setTimeout(() => startPGListener(pool), 5000)
    })

    console.log('PostgreSQL LISTEN active on admin_changes')
  }).catch((err) => {
    console.error('PG LISTEN connect error:', err)
    setTimeout(() => startPGListener(pool), 5000)
  })
}
