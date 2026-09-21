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
  authorizeUrl: string
  state: string
}
export type AgentRefreshResponse = { code: number; msg: string; data: { expires_in: number; token_type: string } }
export type AgentRuntimeServer = {
  url?: string | null
  method?: string | null
  headers?: Record<string, string>
  body?: Record<string, unknown>
  [key: string]: unknown
}
export type AgentRuntimeAccess = {
  llm?: {
    url?: string | null
    method?: string | null
    headers?: Record<string, string>
    body?: Record<string, unknown>
    llmServers?: Record<string, AgentRuntimeServer>
  }
  mcp?: { mcpServers?: Record<string, unknown> }
  api?: { apiServers?: Record<string, AgentRuntimeServer> }
  knowledge?: { knowledgeServers?: Record<string, AgentRuntimeServer> }
  database?: { databaseServers?: Record<string, unknown> }
}
export type AgentRuntimeChatResponse = { status_code: number; data: unknown; mcp_session_id?: string | null }
export type AgentAccessContext = {
  agentId: number
  agentCode: string
  agentName: string
  clientId: string
  userId: number | string | null
  userName: string
  fullName: string
  resourceType: string
  resourceCode: string
}

let agentLoginRequest: { code: string; state: string; promise: Promise<AuthUser> } | null = null
let currentUserRequest: Promise<AuthUser> | null = null
const agentLoginMarkerKey = 'seenspace-agent-login'

export function getAgentAuthorizeUrl() {
  return apiPost<AgentAuthorizeResponse>('/api/auth/agent/getAuthorizeUrl')
}

export async function agentLogin(code: string, state: string) {
  if (agentLoginRequest?.code === code && agentLoginRequest.state === state) return agentLoginRequest.promise
  const promise = apiPost<AuthResponse>('/api/auth/agent/login', { code, state })
    .then((response) => {
      setAuthToken(response.token)
      window.localStorage.setItem(agentLoginMarkerKey, 'true')
      return response.user
    })
    .finally(() => {
      if (agentLoginRequest?.code === code && agentLoginRequest.state === state) agentLoginRequest = null
    })
  agentLoginRequest = { code, state, promise }
  return promise
}

export function getCaptcha() {
  return apiGet<CaptchaResponse>('/api/auth/captcha')
}

export function getAgentSessionStatus() { return apiGet<{ connected: boolean; expiresAt: string | null }>('/api/auth/agent/session-status') }
export function refreshAgentToken() { return apiPost<AgentRefreshResponse>('/api/auth/agent/refresh-token', {}) }
export function getAgentRuntimeAccess() { return apiPost<AgentRuntimeAccess>('/api/auth/agent/runtime-access') }
export function getAgentAccessContext() { return apiGet<AgentAccessContext>('/api/auth/agent/access-context') }
export function sendAgentRuntimeChat(input: { message: string; model?: string; llmServer?: string; chatContextId?: string; stream?: boolean }) {
  return apiPost<AgentRuntimeChatResponse>('/api/auth/agent/runtime-chat', input)
}
export function sendAgentRuntimeApi(input: { apiServer: string; resourceType?: 'api' | 'knowledge'; path?: string; method?: string; body?: Record<string, unknown> }) {
  return apiPost<AgentRuntimeChatResponse>('/api/auth/agent/runtime-api', input)
}
export function sendAgentRuntimeMcp(input: { mcpServer: string; resourceType?: 'mcp' | 'database'; body?: Record<string, unknown>; chatContextId?: string; mcpSessionId?: string }) {
  return apiPost<AgentRuntimeChatResponse>('/api/auth/agent/runtime-mcp', input)
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
