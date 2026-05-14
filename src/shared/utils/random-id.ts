export function randomId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  const randomPart = Math.random().toString(36).slice(2, 10)
  return `id-${Date.now().toString(36)}-${randomPart}`
}
