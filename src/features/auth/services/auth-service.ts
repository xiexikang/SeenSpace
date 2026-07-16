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
  return response.user
}

export function getCurrentUser() {
  return apiGet<AuthUser>('/api/auth/me')
}

export function updateUserName(name: string) {
  return apiPatch<AuthUser>('/api/auth/me/name', { name })
}

export function updateUserPassword(currentPassword: string, newPassword: string) {
  return apiPatch<{ ok: boolean }>('/api/auth/me/password', { currentPassword, newPassword })
}

export async function logout() {
  try {
    await apiPost('/api/auth/logout')
  } finally {
    clearAuthToken()
  }
}
