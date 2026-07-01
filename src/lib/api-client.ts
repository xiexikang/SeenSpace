type RequestOptions = {
  body?: unknown
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

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
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
