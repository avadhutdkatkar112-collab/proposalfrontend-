import { WebSocketServer, WebSocket } from 'ws'
import { Server } from 'http'

let wss: WebSocketServer

interface WsMessage {
  type: string
  data: unknown
}

export function initWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws) => {
    console.log('Dashboard connected')

    ws.on('close', () => {
      console.log('Dashboard disconnected')
    })

    ws.on('error', (err) => {
      console.error('WebSocket error:', err)
    })
  })

  return wss
}

export function broadcast(message: WsMessage) {
  if (!wss) return

  const payload = JSON.stringify(message)

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload)
    }
  })
}

export function getClientCount(): number {
  return wss?.clients.size || 0
}
