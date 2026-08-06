const API_URL = import.meta.env.VITE_API_URL || ''

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

export async function resetAllSessions() {
  return apiFetch('/api/sessions', { method: 'DELETE' })
}

export async function getReplayEvents(visitorId: string) {
  return apiFetch(`/api/events/replay/${visitorId}`)
}

let eventSource: EventSource | null = null

export function connectSSE(handlers: {
  onSessionUpdated?: (data: any) => void
  onEventCreated?: (data: any) => void
  onOpen?: () => void
  onError?: () => void
}) {
  if (eventSource) {
    eventSource.close()
  }

  const url = `${API_URL}/api/events/stream`
  eventSource = new EventSource(url)

  eventSource.addEventListener('session.updated', (e) => {
    try {
      const data = JSON.parse(e.data)
      handlers.onSessionUpdated?.(data)
    } catch {}
  })

  eventSource.addEventListener('event.created', (e) => {
    try {
      const data = JSON.parse(e.data)
      handlers.onEventCreated?.(data)
    } catch {}
  })

  eventSource.onopen = () => {
    handlers.onOpen?.()
  }

  eventSource.onerror = () => {
    handlers.onError?.()
  }

  return {
    close: () => {
      eventSource?.close()
      eventSource = null
    },
  }
}
