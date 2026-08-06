// Shared visitor ID — generated once per page load, shared between tracker and replay
let visitorId: string | null = null

export function getVisitorId(): string {
  if (!visitorId) {
    visitorId = Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  }
  return visitorId
}
