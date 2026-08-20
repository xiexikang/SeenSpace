type RequestOptions = {
  body?: unknown
}

export type ApiEnvelope<T> = { code: number; data: T; message: string }

function notifyError(message: string) {
  window.dispatchEvent(new CustomEvent('seenspace-api-error', { detail: message }))
}

const authTokenKey = 'seenspace-auth-token'

export function getAuthToken() {
  return window.localStorage.getItem(authTokenKey)
}

export function setAuthToken(token: string) {
  window.localStorage.setItem(authTokenKey, token)
}

export function clearAuthToken() {
  window.localStorage.removeItem(authTokenKey)
}

async function request<T>(path: string, init?: Omit<RequestInit, 'body'> & RequestOptions): Promise<T> {
  const token = getAuthToken()
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  })

  const contentType = response.headers?.get?.('content-type') ?? ''
  let payload: unknown
  if (contentType.includes('application/json') || typeof response.json === 'function') {
    payload = await response.json()
  }
  if (!response.ok) {
    const envelope = payload as Partial<ApiEnvelope<unknown>> | undefined
    const message = typeof envelope?.message === 'string' ? envelope.message : `请求失败（${response.status}）`
    notifyError(message)
    throw new Error(message)
  }
  if (response.status === 204 || payload === undefined) return undefined as T
  const envelope = payload as Partial<ApiEnvelope<T>>
  if (typeof envelope.code !== 'number' || !('data' in envelope)) return payload as T
  if (envelope.code !== 0) {
    const message = envelope.message || '请求失败'
    notifyError(message)
    throw new Error(message)
  }
  return envelope.data as T
}

export function apiGet<T>(path: string) {
  return request<T>(path, { method: 'GET' })
}

export function apiPost<T>(path: string, body?: unknown) {
  return request<T>(path, { method: 'POST', body })
}

export function apiPatch<T>(path: string, body: unknown) {
  return request<T>(path, { method: 'PATCH', body })
}

export function apiDelete(path: string) {
  return request<void>(path, { method: 'DELETE' })
}
