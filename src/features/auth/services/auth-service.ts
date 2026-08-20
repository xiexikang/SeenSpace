import { apiGet, apiPatch, apiPost, clearAuthToken, setAuthToken } from '../../../lib/api-client'

export type AuthUser = {
  id: string
  username: string
  name: string
}

export type CaptchaResponse = {
  captchaId: string
  svg: string
}

type AuthResponse = {
  token: string
  user: AuthUser
}

export type AgentAuthorizeResponse = {
  code: number
  msg: string
  data: {
    authorizeUrl: string
    state: string
  }
}

let agentLoginRequest: { code: string; promise: Promise<AuthUser> } | null = null
let currentUserRequest: Promise<AuthUser> | null = null
const agentLoginMarkerKey = 'seenspace-agent-login'

export function getAgentAuthorizeUrl() {
  return apiPost<AgentAuthorizeResponse>('/api/auth/agent/getAuthorizeUrl', {
    clientId: 'ag85af50c6357b4baf',
    clientSecret: '866b740d443c44bf9a47a1ad9fbfac2c',
  })
}

export async function agentLogin(code: string) {
  if (agentLoginRequest?.code === code) return agentLoginRequest.promise
  const promise = apiPost<AuthResponse>('/api/auth/agent/login', { code })
    .then((response) => {
      setAuthToken(response.token)
      window.localStorage.setItem(agentLoginMarkerKey, 'true')
      return response.user
    })
    .finally(() => {
      if (agentLoginRequest?.code === code) agentLoginRequest = null
    })
  agentLoginRequest = { code, promise }
  return promise
}

export function getCaptcha() {
  return apiGet<CaptchaResponse>('/api/auth/captcha')
}

export async function login(input: {
  username: string
  password: string
  captchaId: string
  captchaCode: string
}) {
  const response = await apiPost<AuthResponse>('/api/auth/login', input)
  setAuthToken(response.token)
  window.localStorage.removeItem(agentLoginMarkerKey)
  return response.user
}

export async function register(input: {
  username: string
  name: string
  password: string
  captchaId: string
  captchaCode: string
}) {
  const response = await apiPost<AuthResponse>('/api/auth/register', input)
  setAuthToken(response.token)
  window.localStorage.removeItem(agentLoginMarkerKey)
  return response.user
}

export function getCurrentUser() {
  if (!currentUserRequest) {
    currentUserRequest = apiGet<AuthUser>('/api/auth/me').then((user) => {
      if (user.id.startsWith('agent-')) window.localStorage.setItem(agentLoginMarkerKey, 'true')
      return user
    }).finally(() => {
      currentUserRequest = null
    })
  }
  return currentUserRequest
}

export function updateUserName(name: string) {
  return apiPatch<AuthUser>('/api/auth/me/name', { name })
}

export function updateUserPassword(currentPassword: string, newPassword: string) {
  return apiPatch<{ ok: boolean }>('/api/auth/me/password', { currentPassword, newPassword })
}

export async function logout() {
  const isAgentLogin = window.localStorage.getItem(agentLoginMarkerKey) === 'true'
  try {
    await apiPost(isAgentLogin ? '/api/auth/agent/logout' : '/api/auth/logout')
  } finally {
    currentUserRequest = null
    window.localStorage.removeItem(agentLoginMarkerKey)
    clearAuthToken()
  }
}
