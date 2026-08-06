const API_URL = import.meta.env.VITE_API_URL || ''
const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.host}/ws`

let authToken: string | null = localStorage.getItem('admin_token')

export function setToken(token: string) {
  authToken = token
  localStorage.setItem('admin_token', token)
}

export function getToken() {
  return authToken
}

export function clearToken() {
  authToken = null
  localStorage.removeItem('admin_token')
}

async function apiFetch(path: string, options: RequestInit = {}, redirectOn401 = true) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    clearToken()
    if (redirectOn401) window.location.reload()
    throw new Error('Unauthorized')
  }

  return res.json()
}

export async function login(username: string, password: string) {
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  if (res.token) setToken(res.token)
  return res
}

export async function verifyToken() {
  try {
    const res = await apiFetch('/api/auth/verify', {}, false)
    return res.valid
  } catch {
    return false
  }
}

export async function getSessions() {
  return apiFetch('/api/sessions')
}

export async function getSession(visitorId: string) {
  return apiFetch(`/api/sessions/${visitorId}`)
}

export async function resetSession(visitorId: string) {
  return apiFetch(`/api/sessions/${visitorId}`, { method: 'DELETE' })
}

export function connectWebSocket(onMessage: (data: any) => void) {
  const ws = new WebSocket(WS_URL)

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      onMessage(data)
    } catch {}
  }

  ws.onclose = () => {
    // Reconnect after 3s
    setTimeout(() => connectWebSocket(onMessage), 3000)
  }

  ws.onerror = () => {
    ws.close()
  }

  return ws
}
